const currencyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

export function MoneyText({ amount }: { amount: number | string }) {
  return <span className="money-text">{currencyFormatter.format(Number(amount))}</span>
}
