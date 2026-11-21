package app.homelift.settings;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
class SettingsController {

	private final SettingsService service;

	SettingsController(SettingsService service) {
		this.service = service;
	}

	@GetMapping
	Settings get() {
		return this.service.get();
	}

	/** Replaces all settings at once. */
	@PutMapping
	Settings save(@Valid @RequestBody Settings settings) {
		return this.service.save(settings);
	}

}
