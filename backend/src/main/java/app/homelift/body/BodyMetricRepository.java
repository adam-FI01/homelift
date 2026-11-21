package app.homelift.body;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import app.homelift.body.BodyMetric.Kind;

/** Plain SQL: the table is small and flat, so an entity would add nothing. */
@Repository
class BodyMetricRepository {

	private static final RowMapper<BodyMetric> ROW = (rs, n) -> new BodyMetric(rs.getLong("id"),
			LocalDate.parse(rs.getString("measured_on")), Kind.valueOf(rs.getString("kind")), rs.getDouble("value"));

	private final JdbcClient jdbc;

	BodyMetricRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	List<BodyMetric> find(@Nullable Kind kind, @Nullable LocalDate from, @Nullable LocalDate to) {
		return this.jdbc.sql("""
				select id, measured_on, kind, value from body_metric
				where (:kind is null or kind = :kind)
				  and (:from is null or measured_on >= :from)
				  and (:to is null or measured_on < :to)
				order by measured_on, kind""")
			.param("kind", (kind != null) ? kind.name() : null)
			.param("from", (from != null) ? from.toString() : null)
			.param("to", (to != null) ? to.toString() : null)
			.query(ROW)
			.list();
	}

	/** Saves the value for that day and kind, replacing one already there. */
	BodyMetric upsert(LocalDate date, Kind kind, double value) {
		this.jdbc.sql("""
				insert into body_metric (measured_on, kind, value) values (:date, :kind, :value)
				on conflict (measured_on, kind) do update set value = excluded.value""")
			.param("date", date.toString())
			.param("kind", kind.name())
			.param("value", value)
			.update();
		return this.jdbc.sql("select id, measured_on, kind, value from body_metric where measured_on = :date and kind = :kind")
			.param("date", date.toString())
			.param("kind", kind.name())
			.query(ROW)
			.single();
	}

	Optional<BodyMetric> findById(long id) {
		return this.jdbc.sql("select id, measured_on, kind, value from body_metric where id = :id")
			.param("id", id)
			.query(ROW)
			.optional();
	}

	void delete(long id) {
		this.jdbc.sql("delete from body_metric where id = :id").param("id", id).update();
	}

}
