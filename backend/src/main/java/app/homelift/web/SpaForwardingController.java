package app.homelift.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Sends client-side routes (for example /exercises/42/edit) to the Angular app so deep links and
 * page refreshes work. Only paths whose every segment has no dot are forwarded, so files such as
 * /media/inter.woff2 or /icons/icon-192.png are served as they are; /api and /actuator are left
 * alone.
 */
@Controller
class SpaForwardingController {

	private static final String FIRST = "{a:^(?!api$|actuator$)[^.]+}";

	private static final String NEXT = "{b:[^.]+}";

	private static final String LAST = "{c:[^.]+}";

	@GetMapping({ "/" + FIRST, "/" + FIRST + "/" + NEXT, "/" + FIRST + "/" + NEXT + "/" + LAST })
	String forward() {
		return "forward:/index.html";
	}

}
