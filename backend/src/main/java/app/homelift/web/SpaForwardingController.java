package app.homelift.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Sends client-side routes (for example /workouts/42) to the Angular app so deep links and
 * page refreshes work. Paths with a file extension, /api and /actuator are left alone.
 */
@Controller
class SpaForwardingController {

	@GetMapping({ "/{path:^(?!api|actuator)[^.]*}", "/{path:^(?!api|actuator)[^.]*}/**" })
	String forward() {
		return "forward:/index.html";
	}

}
