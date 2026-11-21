package app.homelift.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

class TooManyAttemptsException extends ErrorResponseException {

	TooManyAttemptsException() {
		super(HttpStatus.TOO_MANY_REQUESTS);
		getBody().setTitle("Too many attempts");
		getBody().setDetail("Wait 30 seconds and try again.");
	}

}
