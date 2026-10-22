package vn.ueh.kltn.restaurant.entity;
import static org.junit.jupiter.api.Assertions.*;
import static vn.ueh.kltn.restaurant.TestFixtures.*;
import org.junit.jupiter.api.Test;
import vn.ueh.kltn.restaurant.enums.ReservationStatus;
import vn.ueh.kltn.restaurant.exception.*;
class ReservationTest {
    @Test void confirmSeatedIsStrict() {
        var r = reservation(table(1L, 4)); r.confirmSeated();
        assertEquals(ReservationStatus.SEATED, r.getStatus());
        assertEquals(ErrorCode.INVALID_STATE, assertThrows(BusinessException.class, r::confirmSeated).getErrorCode());
        assertThrows(BusinessException.class, r::cancel);
    }
    @Test void cancelIsIdempotentAndCannotSeatCancelled() {
        var r = reservation(table(1L, 4)); r.cancel(); r.cancel();
        assertEquals(ReservationStatus.CANCELLED, r.getStatus());
        assertThrows(BusinessException.class, r::confirmSeated);
    }
}
