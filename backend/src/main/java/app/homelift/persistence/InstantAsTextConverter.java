package app.homelift.persistence;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Stores an {@link Instant} as fixed-width UTC text ({@code 2026-11-20T03:17:38.000Z}). SQLite
 * has no timestamp type, and a fixed width keeps the text sortable and readable in the file.
 */
@Converter(autoApply = true)
public class InstantAsTextConverter implements AttributeConverter<Instant, String> {

	private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
		.withZone(ZoneOffset.UTC);

	@Override
	public String convertToDatabaseColumn(Instant value) {
		return (value != null) ? FORMAT.format(value) : null;
	}

	@Override
	public Instant convertToEntityAttribute(String value) {
		return (value != null) ? Instant.parse(value) : null;
	}

}
