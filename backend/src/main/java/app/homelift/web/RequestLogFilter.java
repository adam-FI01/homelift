package app.homelift.web;

import java.io.IOException;
import java.util.UUID;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Logs one line per API call with method, path, status and duration as key-value pairs, so
 * structured (JSON) logs can be searched. Every log line during the call carries a request id.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class RequestLogFilter extends OncePerRequestFilter {

	private static final Logger logger = LoggerFactory.getLogger(RequestLogFilter.class);

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		return !request.getRequestURI().startsWith("/api/");
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String id = UUID.randomUUID().toString().substring(0, 8);
		long start = System.nanoTime();
		MDC.put("requestId", id);
		response.setHeader("X-Request-Id", id);
		try {
			chain.doFilter(request, response);
		}
		finally {
			int status = response.getStatus();
			long ms = (System.nanoTime() - start) / 1_000_000;
			(status >= 500 ? logger.atWarn() : logger.atInfo()).addKeyValue("method", request.getMethod())
				.addKeyValue("path", request.getRequestURI())
				.addKeyValue("status", status)
				.addKeyValue("durationMs", ms)
				.log("{} {} -> {} in {} ms", request.getMethod(), request.getRequestURI(), status, ms);
			MDC.remove("requestId");
		}
	}

}
