package app.homelift.importer;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

/** The file can't be imported; the message says why, in words for the person who picked it. */
class ImportException extends ErrorResponseException {

	ImportException(String message) {
		super(HttpStatus.UNPROCESSABLE_ENTITY);
		getBody().setTitle("Can't import this file");
		getBody().setDetail(message);
	}

}
