package app.homelift.auth;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * When a PIN is set, every API call needs an unlocked session. The app shell, its assets, the PIN
 * endpoints and the container health check stay open, so the lock screen can load.
 */
@Component
class PinFilter extends OncePerRequestFilter {

	private final PinService pins;

	PinFilter(PinService pins) {
		this.pins = pins;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		String path = request.getRequestURI();
		return !path.startsWith("/api/") || path.startsWith("/api/auth");
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		if (!this.pins.enabled() || this.pins.valid(SessionCookie.read(request))) {
			chain.doFilter(request, response);
			return;
		}
		response.setStatus(HttpStatus.UNAUTHORIZED.value());
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		response.getWriter()
			.write("{\"title\":\"Locked\",\"status\":401,\"detail\":\"Enter your PIN to continue.\"}");
	}

}
