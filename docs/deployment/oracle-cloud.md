# Triển khai DN Restaurant trên Oracle Cloud

Ngày soạn: **24/10/2026**, múi giờ **Asia/Ho_Chi_Minh**.

Guide dành cho **Ubuntu 22.04 hoặc 24.04 trên Oracle Cloud**, thao tác từ máy
Windows chứa repository `D:\capstone_project_ueh`. Domain đã nối nameserver
Cloudflare; bước tiếp theo là thêm record trỏ về VM.

Đọc và làm theo thứ tự. Khối `powershell` chạy trên **Windows**; khối `bash`
chạy trong **phiên SSH Ubuntu**. Các file cấu hình có ghi đường dẫn ngay trước khối.

Đây là hướng dẫn và công cụ để bạn tự chạy. Việc soạn tài liệu chưa cấu hình
Cloudflare, đăng nhập Oracle, khởi động app hay kết nối/ghi vào Neon thật.

## 1. Phạm vi và mô hình triển khai

Chạy frontend và backend trên **một VM Oracle**, giữ database Neon hiện tại.
Frontend gọi API bằng đường dẫn tương đối `/api`, đúng với code đang có.

```mermaid
flowchart TD
    Browser[Trình duyệt] -->|HTTPS| Edge[Cloudflare khi bật proxy]
    Edge -->|HTTPS| Caddy[Caddy trên Oracle: cổng 443]
    Caddy -->|Giao diện| Static[React dist]
    Caddy -->|/api và /api/*| Java[Spring Boot: 127.0.0.1:8080]
    Java -->|PostgreSQL qua TLS| Neon[Neon main hiện tại]
```

Trong lúc cài đặt, để Cloudflare ở **DNS only**: trình duyệt/Let's Encrypt
kết nối thẳng tới Caddy. Sau khi HTTPS origin hoạt động, có thể bật proxy.

| URL hoặc thành phần | Đích |
|---|---|
| `https://dnrestaurant.dpdns.org` | Giao diện React |
| `https://dnrestaurant.dpdns.org/api/*` | API và SSE của Spring Boot |
| `https://api.dnrestaurant.dpdns.org/api/*` | Tùy chọn: cùng backend, thêm ở mục 10.4 |
| Spring Boot | Chỉ nghe `127.0.0.1:8080`, systemd quản lý |
| React | File tĩnh từ `dist`; Caddy phục vụ |
| Database | Neon `main`, dùng endpoint direct |

`/api` trên domain chính đã đủ để ứng dụng hoạt động. Nếu thêm subdomain `api`,
frontend vẫn giữ cách gọi `/api` hiện tại. Hai hostname cùng dùng một tiến trình Java.

Mỗi lần cập nhật, script [deploy-oracle.ps1](../../scripts/deploy-oracle.ps1)
build ở máy Windows, upload bản build và kích hoạt trên Ubuntu. Khi backend
restart, API có một khoảng gián đoạn; đây là cách triển khai một instance.

## 2. Thông tin cần chuẩn bị

| Thông tin | Ví dụ / yêu cầu |
|---|---|
| Public IPv4 của Oracle | `203.0.113.10` là IP minh họa; thay bằng IP VM thật |
| Tài khoản SSH | Thông thường là `ubuntu` |
| Private key SSH | Ví dụ `C:\Users\TEN_WINDOWS\.ssh\oracle.key` |
| Hệ điều hành | Ubuntu 22.04 hoặc 24.04 |
| JDK trên Windows | Java **21**, có `javac` để Maven build |
| Bun trên Windows | Dùng phiên bản dự án, hiện `bun@1.4.3` trong `frontend/package.json` |
| Công cụ Windows | `ssh`, `scp`, `tar`, PowerShell |
| DB credentials | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` của Neon hiện tại |
| JWT secret | Chuỗi ngẫu nhiên riêng cho server, tối thiểu 32 ký tự |

Guide dùng tên SSH alias **`dnrestaurant-oracle`** và tên service
**`dnrestaurant`** xuyên suốt. Tên thư mục trên Ubuntu đều phân biệt hoa thường.

Đối chiếu baseline thực tế trước khi build:

```powershell
Set-Location D:\capstone_project_ueh
git status --short --branch
git log -1 --oneline
java -version
javac -version
bun --version
Get-Command ssh, scp, tar
```

Script deploy lấy **nội dung hiện tại trong working tree**, bao gồm thay đổi chưa
commit. Tự kiểm tra đây là bản bạn muốn đưa lên server. Script không commit/push.

## 3. Kiểm tra VM và địa chỉ IP

### 3.1. Kiểm tra trên Oracle Console

Mở **Compute → Instances → VM của bạn**, tìm **Public IPv4 address**.

VM cần có public IP, thuộc public subnet, có Internet Gateway và route
`0.0.0.0/0 → Internet Gateway`. Nếu bạn đã SSH vào VM trực tiếp bằng public IP
thì đường SSH đang hoạt động, nhưng vẫn phải mở thêm cổng web ở mục 5.
[Điều kiện public IP/network của Oracle](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/managingpublicIPs.htm)

Có thể dùng IP hiện tại. Nếu muốn giữ địa chỉ qua việc thay VM, cân nhắc Reserved
Public IP; Oracle phân biệt IP này với Ephemeral IP theo vòng đời tài nguyên.
Đối chiếu cấu hình hiện tại trước khi đổi IP để giữ đường SSH đang dùng.

### 3.2. Tạo SSH alias trên Windows

Mở PowerShell:

```powershell
New-Item -ItemType Directory -Path "$env:USERPROFILE\.ssh" -Force | Out-Null
notepad "$env:USERPROFILE\.ssh\config"
```

Thêm block sau vào **cuối file**, giữ nguyên các host đang có. Thay IP và đường
dẫn key bằng giá trị thật; dùng dấu `/` trong `IdentityFile`:

```sshconfig
Host dnrestaurant-oracle
    HostName 203.0.113.10
    User ubuntu
    IdentityFile C:/Users/TEN_WINDOWS/.ssh/oracle.key
    IdentitiesOnly yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

Nếu đường dẫn key có khoảng trắng, bọc đường dẫn bằng dấu nháy kép.
`HostName` nên là public IP của Oracle để SSH luôn đi thẳng tới VM khi bật proxy web.

```powershell
ssh dnrestaurant-oracle
```

Lần đầu, đối chiếu host key fingerprint của VM trước khi chấp nhận. Nếu có cảnh
báo host key thay đổi ở một VM đang dùng, kiểm tra nguyên nhân trước khi sửa
`known_hosts`; có thể bạn đang trỏ sai IP hoặc VM đã được tạo lại.

Trong Ubuntu:

```bash
cat /etc/os-release
uname -m
free -h
df -h /
timedatectl
```

`aarch64` là ARM, `x86_64` là AMD64. Các lệnh cài bằng `apt` dưới đây chọn gói
theo kiến trúc của VM. Giữ đồng bộ giờ để JWT và các mốc thời gian hoạt động đúng:

```bash
sudo timedatectl set-timezone Asia/Ho_Chi_Minh
sudo timedatectl set-ntp true
```

Giữ phiên SSH này mở khi cấu hình firewall; dùng thêm một cửa sổ PowerShell để
kiểm tra kết nối từ ngoài.

## 4. Thêm DNS record trên Cloudflare

### 4.1. Record cho domain chính

Trong Cloudflare, chọn zone **`dnrestaurant.dpdns.org` → DNS → Records → Add record**.
Guide giả định đây là tên zone đang quản lý; xem hostname hoàn chỉnh trong bảng
record để chắc chắn tên cuối cùng đúng.

| Trường | Giá trị |
|---|---|
| Type | `A` |
| Name | `@` — kết quả là `dnrestaurant.dpdns.org` |
| IPv4 address / Content | Public IPv4 **thật** của Oracle |
| Proxy status | **DNS only**, đám mây xám trong lúc cài đặt |
| TTL | Auto |

Giữ các record TXT xác minh hoặc email đang sử dụng. Nếu hostname chính đã có
A/CNAME trỏ nơi khác, cập nhật record đó cho đúng đích và xử lý record xung đột.
Với mô hình chỉ dùng IPv4 của guide, kiểm tra record AAAA cũ của cùng hostname
để tránh client/CA kết nối sang một IPv6 chưa cấu hình.

Cloudflare phân biệt record định tuyến A/AAAA/CNAME với TXT dùng xác minh.
[Cách tạo và quản lý record](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)

### 4.2. Record API nếu bạn muốn có subdomain này

Có thể tạo ngay hoặc để sau mục 10.4:

| Trường | Giá trị |
|---|---|
| Type | `A` |
| Name | `api` — kết quả là `api.dnrestaurant.dpdns.org` |
| IPv4 address / Content | Cùng Public IPv4 của Oracle |
| Proxy status | DNS only trong lúc xin chứng chỉ |
| TTL | Auto |

Chỉ tạo record chưa làm subdomain có HTTPS; cần thêm hostname vào Caddy ở mục 10.4.

### 4.3. Kiểm tra DNS từ Windows

```powershell
Resolve-DnsName dnrestaurant.dpdns.org -Type A -Server 1.1.1.1
Resolve-DnsName dnrestaurant.dpdns.org -Type A -Server 8.8.8.8
```

Trong giai đoạn DNS only, kết quả phải có **public IP Oracle**. Nếu đã thêm record
API, kiểm tra tương tự:

```powershell
Resolve-DnsName api.dnrestaurant.dpdns.org -Type A -Server 1.1.1.1
```

Nếu chưa ra IP mới, kiểm tra nameserver/zone có trạng thái Active, tên record,
proxy status và thời gian cache DNS. Làm tiếp sau khi hostname trỏ đúng.

## 5. Mở cổng trên Oracle và Linux

Có **hai lớp firewall**: NSG/Security List của Oracle và firewall trong Ubuntu.
Cả hai lớp đều phải cho kết nối web đi qua.
[Oracle giải thích hai lớp network/host firewall](https://blogs.oracle.com/developers/enabling-network-traffic-to-ubuntu-images-in-oracle-cloud-infrastructure)

### 5.1. Oracle Security List hoặc NSG

Từ trang VM, mở networking/VNIC để tìm subnet và NSG gắn với VM.
Thêm các **Ingress Rules** vào NSG đang gắn VM hoặc Security List của subnet:

| Thuộc tính | HTTP | HTTPS |
|---|---|---|
| Stateless | Tắt, dùng stateful | Tắt, dùng stateful |
| Source type | CIDR | CIDR |
| Source CIDR | `0.0.0.0/0` | `0.0.0.0/0` |
| IP protocol | TCP | TCP |
| Source port range | All | All |
| Destination port range | `80` | `443` |

Giữ rule SSH `22` đang sử dụng; có thể giới hạn nguồn SSH theo IP quản trị của bạn.
Với hai rule stateful này, traffic phản hồi được theo dõi theo kết nối.
[Security Lists và stateful rules](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm)

Chỉ public cổng web 80/443. Backend 8080 nghe loopback; frontend chạy dưới dạng
file tĩnh nên không cần Vite 5173. Database ở Neon, không mở inbound PostgreSQL
5432 trên VM. Giữ Caddy admin API ở loopback mặc định.

Nếu bạn đã giới hạn outbound, cho VM đi ra DNS, HTTPS để cấp/gia hạn chứng chỉ
và TCP 5432 tới Neon. Cấu hình egress mặc định cho phép đi ra thường đã đáp ứng.

### 5.2. Firewall Ubuntu của OCI

**Với Ubuntu image của Oracle, dùng `iptables` và giữ các rule hệ thống.** Oracle
cảnh báo UFW có thể ảnh hưởng các rule thiết yếu của image.
[Lưu ý firewall của Oracle Platform Images](https://docs.oracle.com/en-us/iaas/Content/Compute/References/images.htm)

Kiểm tra trước:

```bash
sudo iptables -L INPUT -n --line-numbers
sudo iptables -S OUTPUT
```

Lưu một bản trước khi thêm rule:

```bash
sudo install -d -m 0700 /root/firewall-backup
sudo sh -c 'iptables-save > /root/firewall-backup/before-dnrestaurant.v4'
```

Thêm hai rule INPUT ở trước rule REJECT nếu chưa có. Các lệnh này giữ rule
SSH và OUTPUT/iSCSI của Oracle:

```bash
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
sudo iptables -L INPUT -n --line-numbers
```

Lưu để còn sau reboot:

```bash
sudo apt update
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

Nếu trình cài hỏi lưu rule hiện tại, chọn **Yes**. Nếu trước đây VM đã dùng một
firewall manager tùy chỉnh, đối chiếu cách manager đó lưu/khôi phục rule để các
rule vừa thêm không bị lần reload sau ghi đè. Guide này theo Ubuntu image gốc OCI.

## 6. Cài Java và Caddy

### 6.1. Java runtime 21

Ubuntu chạy JAR đã build sẵn, nên cài Java runtime:

```bash
sudo apt update
sudo apt install -y openjdk-21-jre-headless ca-certificates curl gnupg openssl nano
java -version
readlink -f /usr/bin/java
```

Kết quả phải là Java **21**. Nếu máy có nhiều Java, chọn Java 21:

```bash
sudo update-alternatives --config java
```

Nếu Ubuntu 22.04 báo không tìm thấy gói, kiểm tra repository `universe` và cập nhật:

```bash
sudo apt install -y software-properties-common
sudo add-apt-repository -y universe
sudo apt update
sudo apt install -y openjdk-21-jre-headless
```

[Gói Java 21 trong Ubuntu 22.04/24.04](https://packages.ubuntu.com/en/openjdk-21-jre-headless)

### 6.2. Caddy từ stable repository

Chạy trên Ubuntu; đây là cách cài qua repository chính thức:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
caddy version
sudo systemctl enable --now caddy
```

Các lệnh thêm repository chỉ cần làm một lần. Khi cập nhật về sau, dùng `apt`
cho gói Caddy đã cài. [Hướng dẫn cài Caddy](https://caddyserver.com/docs/install)

Kiểm tra cổng đang được dùng:

```bash
sudo ss -ltnp
sudo systemctl status caddy --no-pager
```

Nếu 80/443 đã được Nginx/Apache hoặc dịch vụ khác chiếm, xác định dịch vụ đó trước
khi cho Caddy nhận các cổng này. Caddy phải bind được 80/443 để dùng cấu hình bên dưới.

Từ cửa sổ Windows khác, kiểm tra HTTP tới VM; thay IP minh họa:

```powershell
Test-NetConnection 203.0.113.10 -Port 80
curl.exe -I http://dnrestaurant.dpdns.org
```

Với trang mặc định của gói Caddy, HTTP đã phải trả phản hồi. Cổng 443 có thể chưa
listen cho tới khi bạn thêm site HTTPS ở mục 10.

## 7. Tạo thư mục và cấu hình backend

### 7.1. Tài khoản chạy app và các thư mục

Trên Ubuntu:

```bash
id dnrestaurant >/dev/null 2>&1 || sudo useradd --system --user-group --home-dir /srv/dnrestaurant --shell /usr/sbin/nologin dnrestaurant
sudo install -d -o root -g root -m 0755 /srv/dnrestaurant
sudo install -d -o root -g root -m 0755 /srv/dnrestaurant/releases
sudo install -d -o root -g root -m 0700 /etc/dnrestaurant
```

Bố trí sau khi triển khai:

```text
/etc/dnrestaurant/backend.env           # secrets, root đọc
/srv/dnrestaurant/releases/<release>/
    app.jar
    web/index.html
    web/assets/...
/srv/dnrestaurant/current               # symlink tới bản đang chạy
/srv/dnrestaurant/previous              # symlink tới bản trước, sau lần cập nhật thành công
/usr/local/sbin/dnrestaurant-release    # helper được cài sau deploy đầu tiên thành công
```

Release chứa JAR và file web; cấu hình bí mật được nhập trực tiếp trên server.

### 7.2. Tạo file môi trường

Chỉ tạo file trống nếu chưa tồn tại, sau đó mở để nhập thông tin:

```bash
sudo test -e /etc/dnrestaurant/backend.env || sudo install -o root -g root -m 0600 /dev/null /etc/dnrestaurant/backend.env
sudo nano /etc/dnrestaurant/backend.env
```

Nội dung `/etc/dnrestaurant/backend.env`:

```ini
DB_URL='jdbc:postgresql://<DIRECT_NEON_HOST>/neondb?sslmode=require&channelBinding=require'
DB_USERNAME='<NEON_USERNAME>'
DB_PASSWORD='<NEON_PASSWORD>'
JWT_SECRET='<RANDOM_SECRET_AT_LEAST_32_CHARACTERS>'
```

Thay **toàn bộ placeholder**, gồm database name nếu tên thật khác `neondb`.
Các giá trị trong file là định dạng `EnvironmentFile` của systemd: mỗi biến một
dòng, không thêm `export`, giữ giá trị trong dấu nháy đơn như ví dụ. Nếu giá trị
thật có dấu nháy đơn, dùng cú pháp quoting phù hợp thay vì giữ nguyên mẫu.

Lấy credentials từ cấu hình Neon đang dùng cho dự án. `DB_URL` phải có tiền tố
**`jdbc:postgresql://`** và hostname **direct, không chứa `-pooler`**, theo quy tắc
Flyway của repository. Không dùng nguyên connection string `postgresql://user:pass@...`
làm JDBC URL; username và password nằm ở hai biến riêng.

Tạo JWT secret một lần trên Ubuntu:

```bash
openssl rand -hex 32
```

Copy chuỗi vừa tạo vào `JWT_SECRET` trong editor. Giữ nguyên chuỗi này ở các lần
deploy sau để JWT đang dùng tiếp tục hợp lệ; thay secret sẽ làm token cũ mất hiệu lực.

Trong nano: **Ctrl+O → Enter** để lưu, **Ctrl+X** để thoát. Chốt permission:

```bash
sudo chown root:root /etc/dnrestaurant/backend.env
sudo chmod 0600 /etc/dnrestaurant/backend.env
sudo stat -c '%a %U:%G %n' /etc/dnrestaurant/backend.env
```

Kỳ vọng `600 root:root`. systemd đọc file rồi truyền môi trường cho tiến trình
chạy bằng user `dnrestaurant`. Giữ secrets ngoài thư mục release và ngoài Git.
[EnvironmentFile của systemd](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html#EnvironmentFile=)

## 8. Tạo service systemd

Trên Ubuntu:

```bash
sudo nano /etc/systemd/system/dnrestaurant.service
```

Dán nguyên nội dung sau vào `/etc/systemd/system/dnrestaurant.service`:

```ini
[Unit]
Description=DN Restaurant Spring Boot API
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=dnrestaurant
Group=dnrestaurant
WorkingDirectory=/srv/dnrestaurant
EnvironmentFile=/etc/dnrestaurant/backend.env
Environment=SPRING_PROFILES_ACTIVE=prod
Environment=APP_SEED=false
Environment=SERVER_ADDRESS=127.0.0.1
Environment=SERVER_PORT=8080
Environment=TZ=Asia/Ho_Chi_Minh
ExecStart=/usr/bin/java -Xms128m -Xmx512m -jar /srv/dnrestaurant/current/app.jar
Restart=on-failure
RestartSec=5
TimeoutStopSec=45
SuccessExitStatus=143
NoNewPrivileges=true
PrivateTmp=true
UMask=0027

[Install]
WantedBy=multi-user.target
```

Giá trị `-Xmx512m` là trần **Java heap**, tổng RAM tiến trình còn có phần native.
Theo dõi RAM thực tế bằng `free -h`/log; nếu thay trần này, cân đối RAM của VM.

Các điểm gắn với code hiện tại:

- Profile `prod` dùng cấu hình mặc định và env vars; không cần tạo thêm file
  `application-prod.yaml`. Swagger chỉ bật trong profile `local` của dự án.
- `APP_SEED=false` tắt các runner seed đã có, giữ dataset Neon hiện tại.
- Flyway vẫn chạy và JPA vẫn `validate` theo cấu hình repository. Kiểm tra migration
  sắp triển khai và có bản sao lưu phù hợp trước các lần đổi schema về sau.
- `127.0.0.1:8080` để Caddy gọi nội bộ, hạn chế public trực tiếp backend.

Spring Boot hỗ trợ override các property này bằng biến môi trường.
[Quy tắc external configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html)

Kiểm tra unit và bật chạy sau reboot:

```bash
sudo systemd-analyze verify /etc/systemd/system/dnrestaurant.service
sudo systemctl daemon-reload
sudo systemctl enable dnrestaurant
```

**Chưa start ở bước này:** `current/app.jar` sẽ có sau lần upload đầu tiên.

## 9. Build, upload và chạy bản đầu tiên

### 9.1. Chạy script trên Windows

Mở PowerShell tại repository:

```powershell
Set-Location D:\capstone_project_ueh
```

Nếu policy mặc định chặn chạy script, cho phép script trong **phiên PowerShell
hiện tại** rồi chạy:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\deploy-oracle.ps1
```

Nếu dùng SSH alias khác:

```powershell
.\scripts\deploy-oracle.ps1 -SshAlias ten-alias-cua-ban
```

Script thực hiện theo thứ tự:

1. Kiểm tra SSH; lần đầu có thể hỏi passphrase của private key.
2. Backend: `mvnw.cmd clean verify`.
3. Frontend: `bun install --frozen-lockfile`, test, lint và build.
4. Đóng gói **chỉ JAR + dist** vào `.cache/deploy/<release>/release.tar.gz`.
5. Upload archive, SHA-256 và helper tới `~/dnrestaurant-upload/<release>/`.
6. Helper dùng `sudo`, kiểm tra checksum, tạo release, đổi symlink và restart API.
7. Chờ tối đa khoảng 3 phút cho backend trả **401** ở `/api/auth/me` khi chưa có JWT.

Giữ terminal mở trong lúc kích hoạt. Nếu `sudo` của VM có password, nhập khi
được hỏi. User Ubuntu mặc định trên nhiều OCI image đã có quyền sudo phù hợp.

Build/test lỗi thì script dừng trước bước upload. Backend lỗi khởi động thì
helper thử quay lại release cũ, nếu đã có. Script không rollback dữ liệu hoặc
schema trong database.

Các file hỗ trợ trong repo:

- [Script PowerShell](../../scripts/deploy-oracle.ps1).
- [Helper Ubuntu](../../scripts/deployment/oracle-release.sh).

### 9.2. Kiểm tra API trong Ubuntu

```bash
sudo systemctl status dnrestaurant --no-pager
sudo journalctl -u dnrestaurant -n 100 --no-pager
sudo ss -ltnp | grep ':8080'
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/api/auth/me
readlink -f /srv/dnrestaurant/current
sudo -u caddy test -r /srv/dnrestaurant/current/web/index.html && echo 'Caddy can read index.html'
```

Kỳ vọng:

- Service `active (running)`, log khởi động thành công.
- Socket **`127.0.0.1:8080`**.
- `/api/auth/me` trả **401** vì request chưa có JWT — kết quả đúng.
- Caddy đọc được `index.html`.

Dự án hiện không có public `/actuator/health`; probe trên kiểm tra startup và
security routing. Đăng nhập, truy vấn DB và SSE cần kiểm tiếp sau khi có HTTPS.

## 10. Cấu hình Caddy và cấp HTTPS

### 10.1. Cấu hình domain chính

Điều kiện trước bước này: DNS **DNS only** đã ra đúng IP Oracle, cổng TCP 80/443
được mở ở cả hai lớp firewall, backend và bản build web đã sẵn sàng.

Trên Ubuntu, sao lưu Caddyfile hiện tại rồi mở editor:

```bash
sudo cp -a /etc/caddy/Caddyfile /etc/caddy/Caddyfile.before-dnrestaurant
sudo nano /etc/caddy/Caddyfile
```

Với VM dành riêng cho dự án, thay nội dung file bằng block dưới. Nếu VM đang
phục vụ website khác, ghép thêm site block và giữ site hiện có.

```caddyfile
dnrestaurant.dpdns.org {
    @api path /api /api/*

    handle @api {
        header Cache-Control "no-store"
        reverse_proxy 127.0.0.1:8080
    }

    handle {
        root * /srv/dnrestaurant/current/web
        encode zstd gzip
        header Cache-Control "no-cache"
        try_files {path} /index.html
        file_server
    }
}
```

Hai nhánh `handle` giữ request API riêng với React SPA. `try_files` giúp mở trực
tiếp hoặc F5 tại `/floor-plan`, `/sessions/13`... vẫn về React Router.
Giữ nguyên prefix `/api` khi proxy: các controller Spring đang dùng prefix này.
[Mẫu SPA và API của Caddy](https://caddyserver.com/docs/caddyfile/patterns)

`encode` chỉ nằm ở nhánh file web. Nhánh API giữ cấu hình streaming mặc định;
Caddy flush ngay phản hồi `text/event-stream`, phù hợp SSE của ứng dụng.
[Reverse proxy streaming](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#streaming)

### 10.2. Validate và reload

```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
sudo journalctl -u caddy -n 100 --no-pager
```

`validate` kiểm cấu hình; việc lấy chứng chỉ còn phụ thuộc DNS và kết nối thực tế
khi Caddy chạy. Theo dõi log đến khi chứng chỉ được cấp thành công.

Caddy tự lấy chứng chỉ TLS công khai và tự gia hạn, bao gồm hỗ trợ Let's Encrypt.
Trong quy trình này, Caddy là thành phần quản lý chứng chỉ trên Oracle.
Giữ thư mục dữ liệu Caddy của service (`/var/lib/caddy`) qua các lần deploy ứng dụng.
[HTTPS tự động và điều kiện cấp chứng chỉ](https://caddyserver.com/docs/automatic-https)

### 10.3. Kiểm HTTPS từ Windows khi vẫn DNS only

```powershell
curl.exe -I http://dnrestaurant.dpdns.org
curl.exe -I https://dnrestaurant.dpdns.org
curl.exe -i https://dnrestaurant.dpdns.org/api/auth/me
```

Kỳ vọng HTTP chuyển sang HTTPS; trang chính HTTPS trả **200**, API chưa có JWT
trả **401** với response API. Mở website trên trình duyệt để kiểm tra chứng chỉ.

Giữ kiểm tra xác thực chứng chỉ mặc định của curl; phải xử lý lỗi certificate
trước khi bật proxy. Caddy sẽ tự gia hạn khi các điều kiện ACME tiếp tục đáp ứng.

### 10.4. Tùy chọn: thêm `api.dnrestaurant.dpdns.org`

Sau khi record `api` ở mục 4.2 phân giải đúng, thêm block sau vào cùng Caddyfile:

```caddyfile
api.dnrestaurant.dpdns.org {
    header Cache-Control "no-store"
    reverse_proxy 127.0.0.1:8080
}
```

Chạy lại fmt/validate/reload như mục 10.2. Caddy lấy thêm chứng chỉ cho hostname
này. Trên Windows:

```powershell
curl.exe -i https://api.dnrestaurant.dpdns.org/api/auth/me
```

Kỳ vọng **401**. Đường dẫn API vẫn có `/api`: ví dụ login là
`https://api.dnrestaurant.dpdns.org/api/auth/login`.

Giao diện trên domain chính tiếp tục gọi `/api` như hiện tại. Nếu về sau bạn đổi
frontend sang gọi subdomain API trực tiếp, cần cập nhật cả Axios, SSE và CORS;
guide hiện tại dùng mô hình cùng origin nên không cần thay code đó.

## 11. Bật Cloudflare proxy

Bước này tùy chọn; **DNS only + HTTPS Caddy đã dùng được ứng dụng**.
Nếu bật Cloudflare proxy, thực hiện sau khi mục 10 đã pass:

1. Cloudflare → **SSL/TLS → Overview → Full (strict)**.
2. Trong **SSL/TLS → Edge Certificates**, kiểm tra edge certificate bao phủ
   hostname và đang Active. Chờ cấp xong nếu còn Pending.
3. DNS → chuyển record domain chính sang **Proxied**, đám mây cam.
4. Nếu đã cấu hình và kiểm HTTPS của subdomain API, có thể bật proxy cho record đó.
5. Lặp lại các kiểm tra HTTPS/API bên dưới và kiểm tra SSE ở mục 12.

Full (strict) kiểm cả chứng chỉ giữa Cloudflare và Oracle, cần origin có chứng chỉ
hợp lệ, đúng hostname. Giữ chế độ này; cấu hình Flexible dễ xung đột với redirect
HTTPS trên Caddy.
[Yêu cầu Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)

Sau khi bật proxy, DNS công khai có thể trả IP Cloudflare; đây là hành vi đúng.
SSH alias vẫn dùng IP Oracle đã lưu trong `HostName`.

### 11.1. Cache API

Caddyfile đã gửi `Cache-Control: no-store` cho API. Nếu có Cache Rules riêng,
đảm bảo chúng giữ API ngoài cache. Có thể tạo một Cache Rule với expression:

```text
(http.host in {"dnrestaurant.dpdns.org" "api.dnrestaurant.dpdns.org"}
 and (http.request.uri.path eq "/api" or starts_with(http.request.uri.path, "/api/")))
```

Action: **Cache eligibility → Bypass cache**. Đặt thứ tự sao cho rule cache rộng
hơn không ghi đè kết quả này. Các endpoint có JWT và SSE cần giữ response động.
[Thiết lập Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/)

### 11.2. Kiểm origin riêng khi đã proxy

Trong Windows, thay IP minh họa bằng IP Oracle thật:

```powershell
curl.exe --resolve "dnrestaurant.dpdns.org:443:203.0.113.10" -I https://dnrestaurant.dpdns.org
curl.exe -I https://dnrestaurant.dpdns.org
curl.exe -i https://dnrestaurant.dpdns.org/api/auth/me
```

Lệnh `--resolve` giữ hostname/SNI để kiểm chứng chỉ nhưng nối thẳng tới Oracle.
Nếu origin pass mà đường qua Cloudflare lỗi, kiểm SSL mode, edge cert, cache và
các rule bảo vệ tại Cloudflare. Giữ cổng 80 hoạt động để Caddy có thể dùng HTTP
challenge khi cấp/gia hạn sau này; kiểm log Caddy nếu renewal gặp vấn đề.

## 12. Kiểm tra sau triển khai

### 12.1. Giao diện, API và database

Truy cập `https://dnrestaurant.dpdns.org` và đăng nhập bằng tài khoản hiện có.
Guide tắt seed nên không sinh tài khoản hoặc đặt lại mật khẩu.

| Kiểm tra | Kỳ vọng |
|---|---|
| Mở trang chính | Giao diện React, chứng chỉ hợp lệ |
| F5 tại route của vai trò đang đăng nhập | Vẫn mở được ứng dụng |
| DevTools → Network: `/api/auth/login` | 200 với tài khoản đúng |
| `/api/auth/me` sau login | 200, thông tin người dùng |
| Trang dữ liệu được phép theo vai trò | Đọc được dữ liệu Neon hiện có |
| Không có JWT khi gọi `/api/auth/me` | 401 |
| Java trên Ubuntu | Một service `dnrestaurant`, nghe loopback |

Mở thêm một trình duyệt khác để kiểm đăng nhập/vai trò nếu cần. Các bước đọc
trên dùng để kiểm deploy; việc tạo phiên/đơn/phiếu kho mới vẫn theo workflow
nghiệp vụ và quy tắc QA hiện có của repository.

### 12.2. SSE và polling

Sau khi đăng nhập, mở DevTools → **Network**, lọc `events`:

- Request `/api/events` trả **200**, Content-Type `text/event-stream`.
- Kết nối giữ mở/Pending là bình thường.
- Backend hiện gửi comment `connected` khi mở và `ping` khoảng **20 giây/lần**.
- REST trên các màn hình live vẫn có polling dự phòng **30 giây**.

Có thể kiểm riêng trong **Console của trình duyệt đã đăng nhập** bằng đoạn sau.
Nó đọc JWT tại browser và dùng token cho request, không in token ra Console:

```javascript
(async () => {
  const savedSession = JSON.parse(localStorage.getItem('restaurant.session') || 'null')
  if (!savedSession?.accessToken) throw new Error('Hãy đăng nhập trước')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45_000)
  try {
    const response = await fetch('/api/events', {
      headers: { Authorization: `Bearer ${savedSession.accessToken}` },
      signal: controller.signal,
    })
    console.log('SSE status:', response.status, response.headers.get('content-type'))
    if (!response.ok || !response.body) throw new Error('Không mở được SSE')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      console.log(decoder.decode(value, { stream: true }))
    }
  } catch (error) {
    if (error.name !== 'AbortError') throw error
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
})()
```

Kỳ vọng thấy comment đến trong khoảng chờ 45 giây. Request test tự đóng sau đó;
request SSE chính của ứng dụng vẫn hoạt động. Nếu nhận trang HTML/challenge thay
cho stream khi proxied, xem các rule Cloudflare đang áp dụng cho `/api/events`.

Chọn lúc không có người thao tác nghiệp vụ để kiểm restart/reconnect:

```bash
sudo systemctl restart dnrestaurant
```

Trình duyệt cần nối lại SSE sau khi backend lên. Endpoint hiện đóng stream theo
timeout của emitter sau khoảng 30 phút rồi client tự nối lại; việc có request mới
theo chu kỳ này phù hợp code hiện tại.

### 12.3. Kiểm chạy sau reboot

Khi tiện gián đoạn VM:

```bash
sudo systemctl is-enabled dnrestaurant caddy
sudo reboot
```

Sau khi SSH lại được, kiểm hai service, HTTPS, login và SSE như trên. Bước này
kiểm cả rule firewall đã lưu và việc service tự chạy khi VM khởi động.

## 13. Cập nhật ứng dụng và quay lại bản trước

### 13.1. Những lần cập nhật sau

Trên Windows, sau khi sửa code và kiểm bản sẽ deploy:

```powershell
Set-Location D:\capstone_project_ueh
.\scripts\deploy-oracle.ps1
```

Script chạy lại build/test/lint, upload một release có ID mới, đổi `current` và
restart Java. Caddy phục vụ qua symlink nên thường không cần reload khi chỉ đổi
JAR/dist. Mỗi lần deploy thành công, release đang chạy trước đó được lưu trong
`previous`; các release cũ vẫn còn trên đĩa.

Nếu thay unit systemd:

```bash
sudo systemctl daemon-reload
sudo systemctl restart dnrestaurant
```

Nếu chỉ thay `backend.env`, restart `dnrestaurant` để đọc lại. Nếu thay Caddyfile,
fmt/validate rồi reload Caddy như mục 10.2. Giữ DNS và JWT secret qua các lần
cập nhật ứng dụng thông thường.

### 13.2. Xem và rollback release

Trong Ubuntu:

```bash
readlink -f /srv/dnrestaurant/current
readlink -f /srv/dnrestaurant/previous
ls -1 /srv/dnrestaurant/releases
```

Lệnh `previous` chỉ có đích sau khi đã có một lần cập nhật thành công từ bản cũ.
Rollback tới ID của một release đang còn trên đĩa, ví dụ **thay ID minh họa**:

```bash
sudo /usr/local/sbin/dnrestaurant-release rollback 20261024-220000-a1b2c3d4
```

Helper kiểm bản đích, đổi symlink và kiểm backend sau restart. Nếu bản đích lỗi,
helper thử khôi phục bản đang chạy trước lần rollback đó. Sau một lần rollback
thành công, `previous` trỏ về bản vừa rời khỏi.

**Rollback này áp dụng cho JAR và file frontend.** Nó giữ nguyên cấu hình trong
`/etc/dnrestaurant` và không hoàn tác Flyway/schema/dữ liệu. Khi có migration mới,
kiểm khả năng tương thích của JAR cũ trước khi dùng rollback; backup/restore DB
là thao tác riêng theo [README dự án](../../README.md).

### 13.3. Theo dõi dung lượng

```bash
df -h /
sudo du -sh /srv/dnrestaurant/releases
du -sh ~/dnrestaurant-upload
sudo journalctl --disk-usage
```

Local `.cache/deploy/`, thư mục upload và release được giữ để bạn kiểm tra.
Khi dọn dung lượng, đối chiếu `current`/`previous` và chỉ dọn các bản không còn
cần dùng. Giữ ít nhất bản hiện tại và một bản đã kiểm hoạt động để quay lại.

## 14. Chẩn đoán lỗi

### 14.1. Các lệnh đọc trạng thái

Trên Ubuntu:

```bash
sudo systemctl status dnrestaurant caddy --no-pager
sudo journalctl -u dnrestaurant -n 100 --no-pager
sudo journalctl -u caddy -n 100 --no-pager
sudo ss -ltnp
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/api/auth/me
```

Khi gửi log để nhờ hỗ trợ, che connection strings, token và thông tin truy cập
nếu log có chứa chúng.

### 14.2. Bảng lỗi thường gặp

| Hiện tượng | Kiểm tra / xử lý |
|---|---|
| DNS không ra public IP Oracle khi DNS only | Zone Active, tên record, IP, AAAA cũ, cache resolver |
| SSH được, website timeout | Ingress 80/443 ở Oracle, INPUT iptables, Caddy có listen cổng tương ứng |
| Caddy không lấy được cert | DNS đang DNS only/trỏ đúng, port 80/443, log ACME; kiểm CAA nếu có rule hạn chế CA |
| Cloudflare 521/522 | Origin service hoặc đường mạng từ Cloudflare tới VM |
| Cloudflare 525/526 | HTTPS/certificate trên origin, hostname trong Caddy và Full (strict) |
| Redirect lặp khi bật proxy | Đối chiếu Full (strict), redirect rules của Cloudflare và Caddy |
| 502 từ Caddy | API chưa chạy hoặc sai upstream; kiểm loopback `/api/auth/me` và log Java |
| F5 route frontend bị 404 | Kiểm nhánh SPA và `try_files {path} /index.html` |
| API trả HTML frontend | API matcher bị sai; giữ nhánh `/api` riêng trước nhánh SPA |
| `/api/auth/me` trả 401 khi chưa login | Kết quả đúng; kiểm tiếp login bằng browser |
| Từ chối login dù đúng tài khoản | Kiểm status account, DB đúng branch; kiểm giờ VM/JWT nếu lỗi sau login |
| Backend báo thiếu env/JWT placeholder | Sửa file root-only `backend.env`, thay placeholder và restart |
| Backend lỗi kết nối DB | JDBC URL, host direct, TLS, username/password, DNS/outbound TCP 5432 |
| Flyway lock lỗi qua PgBouncer | Dùng endpoint direct của Neon theo cấu hình dự án |
| `UnsupportedClassVersionError` | Java runtime chưa phải 21; kiểm `/usr/bin/java` |
| Service `start-limit-hit` | Sửa nguyên nhân, `sudo systemctl reset-failed dnrestaurant`, rồi deploy/start lại |
| SSE không nhận từng đợt ping | Kiểm Content-Type, cache/challenge Cloudflare; so sánh DNS only và proxied |
| Giao diện giữ bản cũ | Reload/revalidate browser, kiểm cache rules; HTML trong Caddyfile dùng `no-cache` |
| SSH báo private key permission quá rộng | Giới hạn quyền file key trên Windows cho tài khoản của bạn |
| Build bị `--frozen-lockfile` chặn | Đồng bộ `frontend/package.json` và lockfile bằng Bun đúng phiên bản rồi kiểm lại |

Khi lỗi cấp chứng chỉ, sửa nguyên nhân trước khi thử lại nhiều lần; có thể dùng
ACME staging theo tài liệu Caddy để chẩn đoán mà hạn chế chạm rate limit của CA.

### 14.3. Lỗi build local

Script dừng ở lệnh lỗi đầu tiên. Có thể chạy từng phần trên Windows:

```powershell
Set-Location D:\capstone_project_ueh\backend\restaurant-management
.\mvnw.cmd clean verify
```

```powershell
Set-Location D:\capstone_project_ueh\frontend
bun install --frozen-lockfile
bun run test
bun run lint
bun run build
```

Lỗi tải Maven/Bun dependencies cần xử lý kết nối Internet hoặc cache của máy
build. VM chỉ nhận artifact đã build; không cài Maven/Bun cho luồng deploy này.

## 15. Checklist hoàn tất và đối chiếu

- [ ] Zone Cloudflare Active; A record trỏ đúng public IP Oracle ở chế độ DNS only.
- [ ] Cổng 80/443 được mở ở Oracle và Ubuntu; đường SSH vẫn dùng được.
- [ ] Java runtime server là 21; Caddy cài và chạy bằng service.
- [ ] `backend.env` có credentials thật, direct host, JWT secret riêng; permission 600.
- [ ] Unit dùng profile prod, seed false, bind 127.0.0.1:8080.
- [ ] Script build/test/lint pass; upload và startup probe pass.
- [ ] HTTPS trực tiếp origin pass trước khi bật proxy.
- [ ] Domain chính mở được React, login/API/đọc dữ liệu đúng.
- [ ] F5 ở route lồng nhau hoạt động; SSE có connected/ping và reconnect.
- [ ] Nếu dùng subdomain API: record, Caddy site và certificate cùng hoạt động.
- [ ] Nếu bật proxy: edge cert Active, Full (strict), API giữ ngoài cache.
- [ ] Đã kiểm reboot và biết release trước để rollback.

Cấu hình được đối chiếu với [application.yaml](../../backend/restaurant-management/src/main/resources/application.yaml),
[SecurityConfig](../../backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/config/SecurityConfig.java),
[API client](../../frontend/src/api/client.ts) và [useRealtime](../../frontend/src/realtime/useRealtime.ts).
Các kết quả build/QA lịch sử của Phase 0–4 nằm trong [chỉ mục tài liệu](../README.md);
chúng không thay cho việc kiểm VM/domain thật sau khi bạn thực hiện guide này.

Kiểm tra khi soạn guide: cú pháp script PowerShell/Bash và các khối lệnh tương
ứng đã pass; đoạn Console SSE đã qua bước parse bằng Bun. Bốn tình huống mock
cục bộ đã kiểm việc đóng gói đúng artifact/checksum, dừng khi backend hoặc
frontend build lỗi và không kích hoạt khi upload lỗi. Các mock không gọi SSH/SCP
thật hoặc chạy build ứng dụng thật. Khởi động service, cấp chứng chỉ, rollback
và SSE qua Oracle/Cloudflare vẫn cần kiểm thực tế sau khi bạn triển khai.
