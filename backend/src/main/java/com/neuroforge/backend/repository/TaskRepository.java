package com.neuroforge.backend.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.neuroforge.backend.entity.BoardStatus;
import com.neuroforge.backend.entity.Task;

public interface TaskRepository extends JpaRepository<Task, Long> {

    long countByStatus(String status);

    List<Task> findByAssigneeId(Long assigneeId);

    List<Task> findByProjectId(Long projectId);

    /** Role scoping: tasks that belong to a set of (already scoped) projects. */
    List<Task> findByProjectIdIn(Collection<Long> projectIds);

    /** Kanban source: one project's tasks in column order. */
    List<Task> findByProjectIdOrderByBoardPositionAscIdAsc(Long projectId);

    long countByProjectIdAndBoardStatus(Long projectId, BoardStatus status);

    long countByProjectId(Long projectId);

    boolean existsByProjectIdAndAssigneeIdAndBoardStatusNot(Long projectId, Long assigneeId, BoardStatus status);

    List<Task> findBySprintIdOrderByBoardStatusAscBoardPositionAsc(Long sprintId);

    List<Task> findBySprintIdAndBoardStatusOrderByBoardPositionAsc(Long sprintId, BoardStatus status);

    List<Task> findByProjectIdAndSprintIsNullOrderByIdDesc(Long projectId);

    Optional<Task> findByTaskKey(String taskKey);

    boolean existsByTaskKey(String taskKey);

    @Query("SELECT t.taskKey FROM Task t WHERE t.project.id = :projectId AND t.taskKey IS NOT NULL")
    List<String> findTaskKeysByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT t FROM Task t WHERE t.taskKey IS NULL ORDER BY t.id ASC")
    List<Task> findTasksWithNullKey();

    @Query("SELECT t FROM Task t WHERE t.project.id = :projectId AND t.taskKey IS NULL ORDER BY t.id ASC")
    List<Task> findTasksWithNullKeyByProjectId(@Param("projectId") Long projectId);

    @Query("select coalesce(sum(t.storyPoints), 0) from Task t " +
            "where t.sprint.id = :sprintId and t.boardStatus = :status")
    int sumPointsBySprintAndStatus(@Param("sprintId") Long sprintId,
                                   @Param("status") BoardStatus status);

    /** Used when a user is deleted: their tasks become unassigned instead of blocking the delete. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Task t set t.assignee = null where t.assignee.id = :userId")
    int unassignUser(@Param("userId") Long userId);
}
