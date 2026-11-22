package app.homelift.exercise;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.ErrorResponseException;

/**
 * Keeps one picture or short clip per exercise as a file in the data folder's {@code media/}
 * directory, so it is backed up with the database. Files are small by design: the app resizes
 * photos before sending them, and clips are capped, because this runs on a Raspberry Pi.
 */
@Service
@Transactional(readOnly = true)
public class ExerciseMediaService {

	/** The folder inside the data folder that holds the files. */
	public static final String DIRECTORY = "media";

	static final long MAX_IMAGE_BYTES = 4L * 1024 * 1024;

	static final long MAX_VIDEO_BYTES = 15L * 1024 * 1024;

	private final ExerciseService exercises;

	private final Path directory;

	ExerciseMediaService(ExerciseService exercises, @Value("${homelift.data-dir}") Path dataDir) {
		this.exercises = exercises;
		this.directory = dataDir.resolve(DIRECTORY);
	}

	/** The folder the files live in (it may not exist until the first upload). */
	public Path directory() {
		return this.directory;
	}

	/**
	 * Saves a picture or clip for an exercise, replacing the one it had.
	 * @param contentType the type the client sent, such as {@code image/jpeg}
	 * @param body the file's bytes
	 */
	@Transactional
	Exercise save(long id, @Nullable String contentType, InputStream body) {
		Exercise exercise = this.exercises.get(id);
		Kind kind = Kind.of(contentType);
		if (kind == null) {
			throw problem(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported file",
					"Use a JPEG, PNG or WebP picture, or an MP4 or WebM clip.");
		}
		String file = id + "-" + UUID.randomUUID() + "." + kind.extension;
		try {
			Files.createDirectories(this.directory);
			Path temp = Files.createTempFile(this.directory, "upload-", ".part");
			try {
				long size = copyLimited(body, temp, kind.type == MediaType.IMAGE ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES);
				if (size == 0 || !kind.matches(temp)) {
					throw problem(HttpStatus.BAD_REQUEST, "Not a " + kind.type.name().toLowerCase() + " file",
							"The file doesn't look like the type it says it is.");
				}
				Files.move(temp, this.directory.resolve(file), StandardCopyOption.ATOMIC_MOVE);
			}
			finally {
				Files.deleteIfExists(temp);
			}
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
		String previous = exercise.getMediaFile();
		exercise.setMedia(file, kind.type);
		deleteQuietly(previous);
		return exercise;
	}

	@Transactional
	Exercise remove(long id) {
		Exercise exercise = this.exercises.get(id);
		String previous = exercise.getMediaFile();
		exercise.setMedia(null, null);
		deleteQuietly(previous);
		return exercise;
	}

	/** The stored file, or a 404 when this isn't the exercise's current one. */
	Resource open(long id, String file) {
		Exercise exercise = this.exercises.get(id);
		if (!file.equals(exercise.getMediaFile())) {
			throw new ExerciseNotFoundException(id);
		}
		return new FileSystemResource(this.directory.resolve(file));
	}

	/** Reads at most {@code limit} bytes into the file; a longer body is refused. */
	private static long copyLimited(InputStream in, Path target, long limit) throws IOException {
		long total = 0;
		byte[] buffer = new byte[16 * 1024];
		try (var out = Files.newOutputStream(target)) {
			int read;
			while ((read = in.read(buffer)) >= 0) {
				total += read;
				if (total > limit) {
					throw problem(HttpStatus.CONTENT_TOO_LARGE, "File too large",
							"Pictures can be up to " + (MAX_IMAGE_BYTES >> 20) + " MB and clips up to "
									+ (MAX_VIDEO_BYTES >> 20) + " MB.");
				}
				out.write(buffer, 0, read);
			}
		}
		return total;
	}

	private void deleteQuietly(@Nullable String file) {
		if (file == null) {
			return;
		}
		try {
			Files.deleteIfExists(this.directory.resolve(file));
		}
		catch (IOException ex) {
			// An orphaned file wastes a little space but harms nothing.
		}
	}

	private static ErrorResponseException problem(HttpStatus status, String title, String detail) {
		ErrorResponseException ex = new ErrorResponseException(status);
		ex.getBody().setTitle(title);
		ex.getBody().setDetail(detail);
		return ex;
	}

	/** The file types accepted, with the first bytes each must start with. */
	enum Kind {

		JPEG(MediaType.IMAGE, "jpg", "image/jpeg"), PNG(MediaType.IMAGE, "png", "image/png"),
		WEBP(MediaType.IMAGE, "webp", "image/webp"), MP4(MediaType.VIDEO, "mp4", "video/mp4"),
		WEBM(MediaType.VIDEO, "webm", "video/webm");

		final MediaType type;

		final String extension;

		final String contentType;

		Kind(MediaType type, String extension, String contentType) {
			this.type = type;
			this.extension = extension;
			this.contentType = contentType;
		}

		static @Nullable Kind of(@Nullable String contentType) {
			if (contentType == null) {
				return null;
			}
			String base = contentType.split(";")[0].strip().toLowerCase();
			for (Kind kind : values()) {
				if (kind.contentType.equals(base)) {
					return kind;
				}
			}
			return null;
		}

		static @Nullable Kind ofExtension(String file) {
			for (Kind kind : values()) {
				if (file.endsWith("." + kind.extension)) {
					return kind;
				}
			}
			return null;
		}

		/** Checks the file's first bytes, so a renamed file of another kind is refused. */
		boolean matches(Path file) throws IOException {
			byte[] head = new byte[12];
			int n;
			try (InputStream in = Files.newInputStream(file)) {
				n = in.readNBytes(head, 0, head.length);
			}
			if (n < 12) {
				return false;
			}
			return switch (this) {
				case JPEG -> (head[0] & 0xFF) == 0xFF && (head[1] & 0xFF) == 0xD8 && (head[2] & 0xFF) == 0xFF;
				case PNG -> (head[0] & 0xFF) == 0x89 && head[1] == 'P' && head[2] == 'N' && head[3] == 'G';
				case WEBP -> head[0] == 'R' && head[1] == 'I' && head[2] == 'F' && head[3] == 'F' && head[8] == 'W'
						&& head[9] == 'E' && head[10] == 'B' && head[11] == 'P';
				case MP4 -> head[4] == 'f' && head[5] == 't' && head[6] == 'y' && head[7] == 'p';
				case WEBM -> (head[0] & 0xFF) == 0x1A && (head[1] & 0xFF) == 0x45 && (head[2] & 0xFF) == 0xDF
						&& (head[3] & 0xFF) == 0xA3;
			};
		}

	}

}
