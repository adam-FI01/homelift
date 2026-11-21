package app.homelift.workout;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

class WorkoutConflictException extends ErrorResponseException {

	WorkoutConflictException(String title, String detail) {
		super(HttpStatus.CONFLICT);
		getBody().setTitle(title);
		getBody().setDetail(detail);
	}

}
