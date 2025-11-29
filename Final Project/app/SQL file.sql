/*
-- Create a view for member dashboard data
CREATE OR REPLACE VIEW member_dashboard_view AS
SELECT 
    u.user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.past_classes_count,
    u.upcoming_sessions_count,
    -- Latest weight
    (SELECT hm.current_value
     FROM "HealthMetric" hm
     WHERE hm.user_id = u.user_id
       AND hm.metric_type = 'weight'
     ORDER BY hm.logged_at DESC
     LIMIT 1) AS current_weight,
    -- Latest body fat
    (SELECT hm.current_value
     FROM "HealthMetric" hm
     WHERE hm.user_id = u.user_id
       AND hm.metric_type = 'body_fat'
     ORDER BY hm.logged_at DESC
     LIMIT 1) AS current_body_fat,
    -- Latest max heart rate
    (SELECT hm.current_value
     FROM "HealthMetric" hm
     WHERE hm.user_id = u.user_id
       AND hm.metric_type = 'max_hr'
     ORDER BY hm.logged_at DESC
     LIMIT 1) AS current_max_hr,
    -- Latest active goal value
    (SELECT fg.target_value
     FROM "FitnessGoal" fg
     WHERE fg.user_id = u.user_id
       AND fg.is_active = true
     ORDER BY fg.created_at DESC
     LIMIT 1) AS active_goal_target,
    -- Latest active goal type
    (SELECT fg.goal_type
     FROM "FitnessGoal" fg
     WHERE fg.user_id = u.user_id
       AND fg.is_active = true
     ORDER BY fg.created_at DESC
     LIMIT 1) AS active_goal_type
FROM "Users" u;

-- Create the trigger to actually update this column
CREATE OR REPLACE FUNCTION update_user_last_metric_date()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "Users" 
    SET last_metric_update = NOW()
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS health_metric_insert_trigger ON "HealthMetric";
CREATE TRIGGER health_metric_insert_trigger
    AFTER INSERT ON "HealthMetric"
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_metric_date();
-- Index to speed up health metric queries by user and type
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_type_date 
ON "HealthMetric" (user_id, metric_type, logged_at DESC);
*/


SELECT * FROM "Users";
--SELECT * FROM "HealthMetric";
--SELECT * FROM "FitnessGoal";
--SELECT * FROM "TrainerAvailability";
--SELECT * FROM "MaintenanceLog"
--SELECT * FROM "RepairTask";
--SELECT * FROM "Bill";
--SELECT * FROM "Payment"