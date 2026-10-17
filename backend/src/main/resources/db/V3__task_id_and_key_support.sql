-- ============================================================
-- NeuroForge Nexus Database Migration V3
-- Task ID and Task Key Support
-- MySQL 8.x
-- Operates on the active database schema (DATABASE()), supporting Railway (railway),
-- local (neuroforge), or custom deployment database names without hardcoding.
-- Non-destructive: preserves existing tasks, subtasks, dependencies, sprints, and foreign keys.
-- ============================================================

DROP PROCEDURE IF EXISTS neuroforge_v3_add_column_if_missing;
DROP PROCEDURE IF EXISTS neuroforge_v3_add_index_if_missing;
DROP PROCEDURE IF EXISTS neuroforge_v3_backfill_project_keys;
DROP PROCEDURE IF EXISTS neuroforge_v3_backfill_task_keys;

DELIMITER $$

CREATE PROCEDURE neuroforge_v3_add_column_if_missing(
    IN p_table VARCHAR(64),
    IN p_column VARCHAR(64),
    IN p_definition VARCHAR(1000)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table
          AND COLUMN_NAME = p_column
    ) THEN
        SET @sql = CONCAT(
            'ALTER TABLE `',
            p_table,
            '` ADD COLUMN `',
            p_column,
            '` ',
            p_definition
        );
        PREPARE v3_stmt FROM @sql;
        EXECUTE v3_stmt;
        DEALLOCATE PREPARE v3_stmt;
    END IF;
END$$

CREATE PROCEDURE neuroforge_v3_add_index_if_missing(
    IN p_table VARCHAR(64),
    IN p_index VARCHAR(64),
    IN p_columns VARCHAR(255),
    IN p_unique BOOLEAN
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table
          AND INDEX_NAME = p_index
    ) THEN
        SET @sql = CONCAT(
            'CREATE ',
            IF(p_unique, 'UNIQUE ', ''),
            'INDEX `',
            p_index,
            '` ON `',
            p_table,
            '` (',
            p_columns,
            ')'
        );
        PREPARE v3_idx_stmt FROM @sql;
        EXECUTE v3_idx_stmt;
        DEALLOCATE PREPARE v3_idx_stmt;
    END IF;
END$$

CREATE PROCEDURE neuroforge_v3_backfill_project_keys()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE p_id BIGINT;
    DECLARE p_name VARCHAR(255);
    DECLARE p_code VARCHAR(50);
    DECLARE candidate VARCHAR(10);
    DECLARE base_prefix VARCHAR(10);
    DECLARE suffix_char INT DEFAULT 65;
    DECLARE num_suffix INT DEFAULT 1;

    DECLARE cur CURSOR FOR
        SELECT id, name, code
        FROM projects
        WHERE project_key IS NULL OR TRIM(project_key) = ''
        ORDER BY id ASC;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO p_id, p_name, p_code;
        IF done = 1 THEN
            LEAVE read_loop;
        END IF;

        SET base_prefix = UPPER(SUBSTRING(REGEXP_REPLACE(IFNULL(NULLIF(p_code, ''), IFNULL(p_name, '')), '[^a-zA-Z0-9]', ''), 1, 3));
        IF LENGTH(base_prefix) < 3 THEN
            SET base_prefix = UPPER(SUBSTRING(CONCAT(base_prefix, 'NEX'), 1, 3));
        END IF;

        SET candidate = base_prefix;
        SET suffix_char = 65;
        SET num_suffix = 1;

        WHILE EXISTS (SELECT 1 FROM projects WHERE UPPER(project_key) = UPPER(candidate) AND id != p_id) DO
            IF suffix_char <= 90 THEN
                SET candidate = CONCAT(SUBSTRING(base_prefix, 1, 2), CHAR(suffix_char USING utf8mb4));
                SET suffix_char = suffix_char + 1;
            ELSE
                SET candidate = SUBSTRING(CONCAT(SUBSTRING(base_prefix, 1, 2), num_suffix), 1, 10);
                SET num_suffix = num_suffix + 1;
            END IF;
        END WHILE;

        UPDATE projects SET project_key = candidate WHERE id = p_id;
    END LOOP;
    CLOSE cur;
END$$

CREATE PROCEDURE neuroforge_v3_backfill_task_keys()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE t_id BIGINT;
    DECLARE t_proj_id BIGINT;
    DECLARE p_key VARCHAR(10);
    DECLARE cur_counter INT DEFAULT 0;
    DECLARE new_key VARCHAR(20);

    DECLARE cur CURSOR FOR
        SELECT t.id, t.project_id, p.project_key
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.task_key IS NULL OR TRIM(t.task_key) = ''
        ORDER BY t.project_id ASC, t.id ASC;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO t_id, t_proj_id, p_key;
        IF done = 1 THEN
            LEAVE read_loop;
        END IF;

        SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(task_key, '-', -1) AS UNSIGNED)), 0) + 1
        INTO cur_counter
        FROM tasks
        WHERE project_id = t_proj_id
          AND task_key LIKE CONCAT(p_key, '-%');

        SET new_key = CONCAT(p_key, '-', cur_counter);

        WHILE EXISTS (SELECT 1 FROM tasks WHERE UPPER(task_key) = UPPER(new_key) AND id != t_id) DO
            SET cur_counter = cur_counter + 1;
            SET new_key = CONCAT(p_key, '-', cur_counter);
        END WHILE;

        UPDATE tasks SET task_key = new_key WHERE id = t_id;
    END LOOP;
    CLOSE cur;
END$$

DELIMITER ;

-- 1. Ensure required columns exist
CALL neuroforge_v3_add_column_if_missing('projects', 'project_key', 'VARCHAR(10) NULL');
CALL neuroforge_v3_add_column_if_missing('projects', 'task_counter', 'INT NOT NULL DEFAULT 0');
CALL neuroforge_v3_add_column_if_missing('tasks', 'task_key', 'VARCHAR(20) NULL');

-- 2. Backfill missing project keys
CALL neuroforge_v3_backfill_project_keys();

-- 3. Backfill missing task keys
CALL neuroforge_v3_backfill_task_keys();

-- 4. Synchronize project task counters with highest existing task keys
UPDATE projects p
SET p.task_counter = (
    SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(t.task_key, '-', -1) AS UNSIGNED)), 0)
    FROM tasks t
    WHERE t.project_id = p.id
      AND t.task_key LIKE CONCAT(p.project_key, '-%')
);

-- 5. Add unique indexes safely
CALL neuroforge_v3_add_index_if_missing('projects', 'uk_projects_project_key', 'project_key', TRUE);
CALL neuroforge_v3_add_index_if_missing('tasks', 'uk_tasks_task_key', 'task_key', TRUE);

-- 6. Cleanup migration procedures
DROP PROCEDURE IF EXISTS neuroforge_v3_add_column_if_missing;
DROP PROCEDURE IF EXISTS neuroforge_v3_add_index_if_missing;
DROP PROCEDURE IF EXISTS neuroforge_v3_backfill_project_keys;
DROP PROCEDURE IF EXISTS neuroforge_v3_backfill_task_keys;

