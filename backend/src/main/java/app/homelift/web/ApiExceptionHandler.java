package app.homelift.web;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Turns errors from the REST controllers into RFC 9457 problem+json. It is scoped to controllers
 * so a browser asking for a missing page still gets the friendly HTML error page.
 */
@RestControllerAdvice(annotations = RestController.class)
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

}
