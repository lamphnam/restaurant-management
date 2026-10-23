package vn.ueh.kltn.restaurant.realtime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Stream;

class SseHubTest {
    static Stream<Exception> disconnectedErrors() {
        return Stream.of(
                new IOException("disconnected"), new IllegalStateException("already complete"));
    }

    @ParameterizedTest
    @MethodSource("disconnectedErrors")
    @SuppressWarnings("unchecked")
    void brokenClientIsRemovedWithoutInterruptingHealthyClientsOrCompletingAgain(Exception failure)
            throws IOException {
        var hub = new SseHub();
        SseEmitter disconnected = mock(SseEmitter.class);
        SseEmitter healthy = mock(SseEmitter.class);
        List<SseEmitter> emitters =
                (List<SseEmitter>) ReflectionTestUtils.getField(hub, "emitters");
        emitters.add(disconnected);
        emitters.add(healthy);
        doThrow(failure).when(disconnected).send(any(SseEmitter.SseEventBuilder.class));
        // A second completion on an errored AsyncContext is illegal on Tomcat.
        doThrow(new IllegalStateException("container already completed"))
                .when(disconnected)
                .complete();
        hub.broadcast(new RealtimeEvent(RealtimeEvent.Type.ORDER, 7L));
        hub.heartbeat();
        verify(disconnected, times(1)).send(any(SseEmitter.SseEventBuilder.class));
        verify(disconnected, never()).complete();
        verify(healthy, times(2)).send(any(SseEmitter.SseEventBuilder.class));
    }
}
