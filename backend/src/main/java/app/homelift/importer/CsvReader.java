package app.homelift.importer;

import java.util.ArrayList;
import java.util.List;

/** A small CSV reader: quoted fields, doubled quotes, line breaks in quotes, and a byte order mark. */
final class CsvReader {

	private CsvReader() {
	}

	/** Splits CSV text into rows of fields. The delimiter (comma, semicolon or tab) is read from the first line. */
	static List<List<String>> read(String text) {
		String input = text.startsWith("﻿") ? text.substring(1) : text;
		char delimiter = delimiter(input);
		List<List<String>> rows = new ArrayList<>();
		List<String> row = new ArrayList<>();
		StringBuilder field = new StringBuilder();
		boolean quoted = false;
		boolean any = false;
		for (int i = 0; i < input.length(); i++) {
			char c = input.charAt(i);
			if (quoted) {
				if (c == '"') {
					if (i + 1 < input.length() && input.charAt(i + 1) == '"') {
						field.append('"');
						i++;
					}
					else {
						quoted = false;
					}
				}
				else {
					field.append(c);
				}
			}
			else if (c == '"') {
				quoted = true;
				any = true;
			}
			else if (c == delimiter) {
				row.add(field.toString());
				field.setLength(0);
				any = true;
			}
			else if (c == '\n' || c == '\r') {
				if (c == '\r' && i + 1 < input.length() && input.charAt(i + 1) == '\n') {
					i++;
				}
				if (any || field.length() > 0) {
					row.add(field.toString());
					rows.add(row);
				}
				row = new ArrayList<>();
				field.setLength(0);
				any = false;
			}
			else {
				field.append(c);
				any = true;
			}
		}
		if (any || field.length() > 0) {
			row.add(field.toString());
			rows.add(row);
		}
		return rows;
	}

	private static char delimiter(String input) {
		int end = input.indexOf('\n');
		String first = (end < 0) ? input : input.substring(0, end);
		int commas = count(first, ',');
		int semicolons = count(first, ';');
		int tabs = count(first, '\t');
		if (tabs > commas && tabs >= semicolons) {
			return '\t';
		}
		return (semicolons > commas) ? ';' : ',';
	}

	private static int count(String s, char c) {
		int n = 0;
		for (int i = 0; i < s.length(); i++) {
			if (s.charAt(i) == c) {
				n++;
			}
		}
		return n;
	}

}
