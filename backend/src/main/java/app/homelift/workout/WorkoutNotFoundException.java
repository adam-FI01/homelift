package app.homelift.workout;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

class WorkoutNotFoundException extends ErrorResponseException {

	WorkoutNotFoundException(String what) {
		super(HttpStatus.NOT_FOUND);
		getBody().setTitle("Not found");
		getBody().setDetail(what + " not found.");
	}

}
