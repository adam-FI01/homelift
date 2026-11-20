package app.homelift.exercise;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

class ExerciseNotFoundException extends ErrorResponseException {

	ExerciseNotFoundException(long id) {
		super(HttpStatus.NOT_FOUND);
		getBody().setTitle("Exercise not found");
		getBody().setDetail("No exercise with id " + id + ".");
	}

}
