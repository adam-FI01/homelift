package app.homelift.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

class PinManagedByEnvironmentException extends ErrorResponseException {

	PinManagedByEnvironmentException() {
		super(HttpStatus.CONFLICT);
		getBody().setTitle("PIN set by the server");
		getBody().setDetail("The PIN comes from the HOMELIFT_PIN environment variable; change it there.");
	}

}
