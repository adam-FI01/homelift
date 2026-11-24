package app.homelift.exercise;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** A photo or short clip for an exercise: upload, show and remove. */
@RestController
@RequestMapping("/api/exercises/{id}/media")
class ExerciseMediaController {

	private final ExerciseMediaService media;

	ExerciseMediaController(ExerciseMediaService media) {
		this.media = media;
	}

	/** The request body is the file itself; its Content-Type says what kind it is. */
	@PutMapping
	ExerciseResponse upload(@PathVariable long id, HttpServletRequest request) throws IOException {
		return ExerciseResponse.of(this.media.save(id, request.getContentType(), request.getInputStream()));
	}

	@DeleteMapping
	ExerciseResponse remove(@PathVariable long id) {
		return ExerciseResponse.of(this.media.remove(id));
	}

	/** The file name is in the URL and changes with every upload, so it can be cached for good. */
	@GetMapping("/{file:[A-Za-z0-9-]+\\.(?:jpg|png|webp|mp4|webm)}")
	ResponseEntity<Resource> show(@PathVariable long id, @PathVariable String file) {
		Resource resource = this.media.open(id, file);
		ExerciseMediaService.Kind kind = ExerciseMediaService.Kind.ofExtension(file);
		if (!resource.exists() || kind == null) {
			throw new ExerciseNotFoundException(id);
		}
		return ResponseEntity.ok()
			.contentType(org.springframework.http.MediaType.parseMediaType(kind.contentType))
			.cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePrivate().immutable())
			.header("Content-Security-Policy", "sandbox")
			.header("X-Content-Type-Options", "nosniff")
			.body(resource);
	}

}
