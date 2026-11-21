package app.homelift.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Locking and unlocking the app, and setting the PIN. */
@RestController
@RequestMapping("/api/auth")
class AuthController {

	private final PinService pins;

	AuthController(PinService pins) {
		this.pins = pins;
	}

	@GetMapping
	State state(HttpServletRequest request) {
		boolean enabled = this.pins.enabled();
		return new State(enabled, !enabled || this.pins.valid(SessionCookie.read(request)),
				this.pins.managedByEnvironment());
	}

	@PostMapping("/unlock")
	ResponseEntity<State> unlock(@Valid @RequestBody Pin body, HttpServletRequest request) {
		String token = this.pins.unlock(body.pin()).orElseThrow(() -> {
			ErrorResponseException ex = new ErrorResponseException(HttpStatus.UNAUTHORIZED);
			ex.getBody().setTitle("Wrong PIN");
			return ex;
		});
		return ResponseEntity.ok()
			.header(HttpHeaders.SET_COOKIE, SessionCookie.set(token, request.isSecure()))
			.body(new State(true, true, this.pins.managedByEnvironment()));
	}

	@PostMapping("/lock")
	ResponseEntity<Void> lock(HttpServletRequest request) {
		return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, SessionCookie.clear(request.isSecure())).build();
	}

	/** Sets or changes the PIN. Changing it needs the current one. */
	@PutMapping("/pin")
	ResponseEntity<State> setPin(@Valid @RequestBody NewPin body, HttpServletRequest request) {
		requireCurrent(body.currentPin(), request);
		String token = this.pins.setPin(body.pin());
		return ResponseEntity.ok()
			.header(HttpHeaders.SET_COOKIE, SessionCookie.set(token, request.isSecure()))
			.body(new State(true, true, false));
	}

	/** Turns the PIN off. Needs the current PIN. */
	@DeleteMapping("/pin")
	State removePin(@Valid @RequestBody Pin body, HttpServletRequest request) {
		requireCurrent(body.pin(), request);
		this.pins.removePin();
		return new State(false, true, false);
	}

	private void requireCurrent(@Nullable String current, HttpServletRequest request) {
		if (this.pins.enabled() && (current == null || !this.pins.matches(current))) {
			ErrorResponseException ex = new ErrorResponseException(HttpStatus.FORBIDDEN);
			ex.getBody().setTitle("Wrong PIN");
			ex.getBody().setDetail("Enter your current PIN to change it.");
			throw ex;
		}
	}

	record State(boolean enabled, boolean unlocked, boolean managedByEnvironment) {
	}

	record Pin(@NotNull String pin) {
	}

	record NewPin(@Nullable String currentPin, @NotNull @Pattern(regexp = "\\d{4,12}", message = "Use 4 to 12 digits") String pin) {
	}

}
