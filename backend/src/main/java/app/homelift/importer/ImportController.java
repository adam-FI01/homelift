package app.homelift.importer;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import app.homelift.importer.ImportDtos.CommitRequest;
import app.homelift.importer.ImportDtos.Preview;
import app.homelift.importer.ImportDtos.PreviewRequest;
import app.homelift.importer.ImportDtos.Result;

/** Imports a workout history from a CSV file: a dry run first, then the import. */
@RestController
@RequestMapping("/api/import")
class ImportController {

	private final ImportService service;

	ImportController(ImportService service) {
		this.service = service;
	}

	/** Reads the file and says what an import would do. Nothing is saved. */
	@PostMapping("/preview")
	Preview preview(@Valid @RequestBody PreviewRequest request) {
		return this.service.preview(request);
	}

	@PostMapping
	Result importHistory(@Valid @RequestBody CommitRequest request) {
		return this.service.commit(request);
	}

}
