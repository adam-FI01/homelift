package app.homelift.exercise;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

class DuplicateExerciseException extends ErrorResponseException {

	DuplicateExerciseException(String name) {
		super(HttpStatus.CONFLICT);
		getBody().setTitle("Exercise already exists");
		getBody().setDetail("An exercise named \"" + name + "\" already exists.");
	}

}
