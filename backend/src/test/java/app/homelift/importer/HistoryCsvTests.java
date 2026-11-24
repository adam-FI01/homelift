package app.homelift.importer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

class HistoryCsvTests {

	@Test
	void readsThePlainFormat() {
		var result = HistoryCsv.parse("""
				date,exercise,weight,reps
				2024-01-15,Bench Press,80,5
				2024-01-15,Bench Press,82.5,4
				2024-01-17,"Squat, high bar",100,5
				""", "KG");
		assertThat(result.format()).isEqualTo("Plain CSV");
		assertThat(result.rows()).hasSize(3);
		assertThat(result.rows().get(1).weightKg()).isEqualTo(82.5);
		assertThat(result.rows().get(2).exercise()).isEqualTo("Squat, high bar");
		assertThat(result.rows().getFirst().startedAt()).isEqualTo(Instant.parse("2024-01-15T12:00:00Z"));
		assertThat(HistoryCsv.workouts(result.rows())).hasSize(2);
	}

	@Test
	void convertsPoundsWhenAskedTo() {
		var result = HistoryCsv.parse("date,exercise,weight,reps\n2024-01-15,Bench Press,135,5\n", "LB");
		assertThat(result.units()).isEqualTo("LB");
		assertThat(result.rows().getFirst().weightKg()).isEqualTo(61.235);
	}

	@Test
	void readsAStrongExport() {
		var result = HistoryCsv.parse("""
				Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
				2024-01-15 18:30:00,Push A,1h 5m,Bench Press (Barbell),1,60,10,0,0,,,
				2024-01-15 18:30:00,Push A,1h 5m,Bench Press (Barbell),W,40,10,0,0,,,
				2024-01-15 18:30:00,Push A,1h 5m,Plank,1,0,0,0,60,,,
				""", "KG");
		assertThat(result.format()).isEqualTo("Strong");
		assertThat(result.rows()).hasSize(2); // the plank has no reps
		assertThat(result.skipped()).isEqualTo(1);
		assertThat(result.rows().getFirst().workoutName()).isEqualTo("Push A");
		assertThat(result.rows().getFirst().startedAt()).isEqualTo(Instant.parse("2024-01-15T18:30:00Z"));
		assertThat(result.rows().get(1).warmup()).isTrue();
	}

	@Test
	void readsAHevyExport() {
		var result = HistoryCsv.parse("""
				"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
				"Pull","15 Jan 2024, 18:30","15 Jan 2024, 19:20","","Lat Pulldown (Cable)","","",0,"warmup",30,12,,,
				"Pull","15 Jan 2024, 18:30","15 Jan 2024, 19:20","","Lat Pulldown (Cable)","","",1,"normal",45,10,,,
				""", "LB");
		assertThat(result.format()).isEqualTo("Hevy");
		assertThat(result.units()).isEqualTo("KG");
		assertThat(result.rows().getFirst().warmup()).isTrue();
		assertThat(result.rows().get(1).weightKg()).isEqualTo(45);
		assertThat(result.rows().getFirst().endedAt()).isEqualTo(Instant.parse("2024-01-15T19:20:00Z"));
	}

	@Test
	void readsAFitNotesExport() {
		var result = HistoryCsv.parse("""
				Date,Exercise,Category,Weight (lbs),Reps,Distance,Distance Unit,Time
				2024-01-15,Bench Press,Chest,135,5,,,
				""", "KG");
		assertThat(result.format()).isEqualTo("FitNotes");
		assertThat(result.units()).isEqualTo("LB");
		assertThat(result.rows().getFirst().weightKg()).isEqualTo(61.235);
	}

	@Test
	void understandsSeveralDateWritings() {
		assertThat(HistoryCsv.time("2024-01-15T18:30:00Z")).isEqualTo(Instant.parse("2024-01-15T18:30:00Z"));
		assertThat(HistoryCsv.time("2024-01-15T18:30:00+02:00")).isEqualTo(Instant.parse("2024-01-15T16:30:00Z"));
		assertThat(HistoryCsv.time("2024-01-15T18:30:00")).isEqualTo(Instant.parse("2024-01-15T18:30:00Z"));
		assertThat(HistoryCsv.time("2024-01-15 18:30")).isEqualTo(Instant.parse("2024-01-15T18:30:00Z"));
		assertThat(HistoryCsv.time("2024/01/15")).isEqualTo(Instant.parse("2024-01-15T12:00:00Z"));
		assertThat(HistoryCsv.time("Jan 15, 2024")).isEqualTo(Instant.parse("2024-01-15T12:00:00Z"));
		assertThat(HistoryCsv.time("15 January 2024")).isEqualTo(Instant.parse("2024-01-15T12:00:00Z"));
		assertThat(HistoryCsv.time("yesterday")).isNull();
		assertThat(HistoryCsv.time("")).isNull();
	}

	@Test
	void keepsGoingPastBadRowsAndSaysWhichWereSkipped() {
		var result = HistoryCsv.parse("""
				date,exercise,weight,reps
				2024-01-15,Bench Press,80,5
				someday,Bench Press,80,5
				2024-01-16,Bench Press,heavy,5
				2024-01-17,,80,5
				""", "KG");
		assertThat(result.rows()).hasSize(1);
		assertThat(result.skipped()).isEqualTo(3);
		assertThat(result.problems()).hasSize(3).anyMatch((p) -> p.startsWith("line 3:") && p.contains("date"));
	}

	@Test
	void readsSemicolonsTabsQuotesAndABom() {
		var semi = HistoryCsv.parse("﻿date;exercise;weight;reps\n2024-01-15;Row;50,5;8\n", "KG");
		assertThat(semi.rows().getFirst().weightKg()).isEqualTo(50.5);
		var tabs = HistoryCsv.parse("date\texercise\tweight\treps\n2024-01-15\tRow\t50\t8\n", "KG");
		assertThat(tabs.rows()).hasSize(1);
		assertThat(CsvReader.read("a,b\n\"x \"\"quoted\"\"\nline\",2\n")).containsExactly(List.of("a", "b"),
				List.of("x \"quoted\"\nline", "2"));
	}

	@Test
	void explainsAFileItCannotUse() {
		assertThatThrownBy(() -> HistoryCsv.parse("", "KG")).hasMessageContaining("empty");
		assertThatThrownBy(() -> HistoryCsv.parse("when,what\n1,2\n", "KG")).hasMessageContaining("date column");
		assertThatThrownBy(() -> HistoryCsv.parse("date,exercise,weight,reps\n", "KG"))
			.hasMessageContaining("No sets");
	}

}
