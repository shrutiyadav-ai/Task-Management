import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { 
  BOARD_QUERY, 
  UPDATE_TASK_MUTATION, 
  UPDATE_COLUMN_MUTATION,
  CREATE_COLUMN_MUTATION,
  DELETE_COLUMN_MUTATION,
  CREATE_TASK_MUTATION,
  DELETE_TASK_MUTATION,
  ADD_BOARD_MEMBER_MUTATION,
  REMOVE_BOARD_MEMBER_MUTATION,
  ASSIGN_USER_MUTATION,
  UNASSIGN_USER_MUTATION,
  ADD_COMMENT_MUTATION,
  DELETE_COMMENT_MUTATION,
  CREATE_LABEL_MUTATION,
  ADD_LABEL_TO_TASK_MUTATION,
  REMOVE_LABEL_FROM_TASK_MUTATION
} from '../graphql/operations';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchFilter from '../components/SearchFilter';
import { 
  DndContext, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  KeyboardSensor,
  closestCorners
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates, 
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  ArrowLeft, Plus, Trash2, X, MessageSquare, Calendar, Users, 
  Tag, Check, UserPlus, Globe, Pencil, GripVertical,
} from 'lucide-react';

// --- Types ---
interface Task {
  id: string;
  title: string;
  description?: string;
  position: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  labels: Array<{ id: string; name: string; color: string }>;
  assignees: Array<{ id: string; email: string; name: string; avatarUrl?: string }>;
  comments: Array<{ id: string; text: string; createdAt: string; user: { id: string; name: string; avatarUrl?: string } }>;
}

interface Column {
  id: string;
  title: string;
  position: number;
  tasks: Task[];
}

// --- Editable Column Header ---
const EditableColumnHeader: React.FC<{
  title: string;
  onSave: (newTitle: string) => void;
  attributes: any;
  listeners: any;
}> = ({ title, onSave, attributes, listeners }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(title); }, [title]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) {
      onSave(trimmed);
    } else {
      setValue(title);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setValue(title); setEditing(false); }
        }}
        className="font-bold text-white text-sm uppercase tracking-wider bg-transparent border border-indigo-500/50 rounded-lg px-2 py-0.5 outline-none w-full"
        autoFocus
        aria-label="Column name"
      />
    );
  }

  return (
    <div
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing flex-1 flex items-center gap-2"
      onDoubleClick={() => {
        setEditing(true);
        setTimeout(() => inputRef.current?.select(), 50);
      }}
      title="Double-click to rename"
    >
      <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0 opacity-0 group-hover/col:opacity-100 transition" aria-hidden="true" />
      <h3 className="font-bold text-white text-sm uppercase tracking-wider select-none truncate">
        {title}
      </h3>
    </div>
  );
};

// --- Sortable Column Component ---
const SortableColumn: React.FC<{
  column: Column;
  onAddTask: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onTaskClick: (task: Task) => void;
  onRenameColumn: (columnId: string, newTitle: string) => void;
  isTaskDimmed: (task: Task) => boolean;
}> = ({ column, onAddTask, onDeleteColumn, onTaskClick, onRenameColumn, isTaskDimmed }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: column.id, data: { type: 'column' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColorMap: Record<string, string> = {
    LOW: '#22c55e',
    MEDIUM: '#3b82f6',
    HIGH: '#f97316',
    URGENT: '#ef4444',
  };

  // Determine column accent color from first task's priority (cosmetic detail)
  const accentColor = column.tasks.length > 0 
    ? priorityColorMap[column.tasks[0]?.priority] || '#6366f1'
    : '#6366f1';

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="w-80 shrink-0 glass-panel rounded-2xl p-4 flex flex-col h-[calc(100vh-14rem)] group/col"
      role="region"
      aria-label={`Column: ${column.title}`}
    >
      {/* Column header with accent bar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5 relative">
        <div className="absolute left-0 top-0 h-[2px] rounded-full transition-all" style={{ backgroundColor: accentColor, width: '40px' }} aria-hidden="true" />
        
        <EditableColumnHeader
          title={column.title}
          onSave={(newTitle) => onRenameColumn(column.id, newTitle)}
          attributes={attributes}
          listeners={listeners}
        />
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-semibold tabular-nums">
            {column.tasks.length}
          </span>
          <button 
            onClick={() => onDeleteColumn(column.id)}
            className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-white/5 transition opacity-0 group-hover/col:opacity-100"
            aria-label={`Delete column ${column.title}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1">
        <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task, idx) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              dimmed={isTaskDimmed(task)}
              index={idx}
            />
          ))}
        </SortableContext>
        {column.tasks.length === 0 && (
          <div className="h-20 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-slate-500 text-xs select-none">
            Drop tasks here
          </div>
        )}
      </div>

      <button
        onClick={() => onAddTask(column.id)}
        className="w-full py-2.5 bg-white/5 hover:bg-indigo-500/10 text-indigo-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98] border border-transparent hover:border-indigo-500/20"
        aria-label={`Add task to ${column.title}`}
      >
        <Plus className="w-3.5 h-3.5" /> Add Task
      </button>
    </div>
  );
};

// --- Sortable Task Card Component ---
const SortableTaskCard: React.FC<{
  task: Task;
  onClick: () => void;
  dimmed: boolean;
  index: number;
}> = ({ task, onClick, dimmed, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : dimmed ? 0.35 : 1,
    scale: dimmed ? '0.97' : '1',
  };

  const priorityColors: Record<string, string> = {
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    URGENT: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  // Overdue check
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`glass-card p-4 rounded-xl cursor-pointer select-none space-y-2.5 relative group stagger-enter ${dimmed ? 'pointer-events-none' : ''}`}
      role="article"
      aria-label={`Task: ${task.title}`}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      // Stagger animation delay
      {...(!dimmed ? { style: { ...style, animationDelay: `${index * 40}ms` } } : { style })}
    >
      <div {...attributes} {...listeners} className="absolute top-2 right-2 z-0 cursor-grab active:cursor-grabbing p-1 rounded opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-slate-300" aria-label="Drag to reorder">
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      
      <div className="relative z-10 space-y-2.5">
        {/* Label pills */}
        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.map((lbl) => (
              <span 
                key={lbl.id} 
                style={{ backgroundColor: `${lbl.color}20`, color: lbl.color, borderColor: `${lbl.color}35` }} 
                className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase"
              >
                {lbl.name}
              </span>
            ))}
          </div>
        )}

        <h4 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors leading-snug pr-6">
          {task.title}
        </h4>

        {task.description && (
          <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-0.5 text-[10px]">
          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>

          <div className="flex items-center gap-3 text-slate-500">
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400 font-semibold' : ''}`}>
                <Calendar className="w-3 h-3" aria-hidden="true" />
                {new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
              </span>
            )}

            {task.comments && task.comments.length > 0 && (
              <span className="flex items-center gap-1" title={`${task.comments.length} comment${task.comments.length !== 1 ? 's' : ''}`}>
                <MessageSquare className="w-3 h-3" aria-hidden="true" />
                {task.comments.length}
              </span>
            )}
            
            {task.assignees.length > 0 && (
              <div className="flex -space-x-1.5">
                {task.assignees.slice(0, 3).map((asg) => (
                  <div 
                    key={asg.id} 
                    className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500/60 to-purple-500/60 flex items-center justify-center text-[8px] text-white font-bold border-2 border-slate-900"
                    title={asg.name}
                  >
                    {asg.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {task.assignees.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[8px] text-white font-bold border-2 border-slate-900">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Board View Component ---
const BoardView: React.FC = () => {
  const { id: boardId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { presenceUsers, joinBoard, leaveBoard, socket } = useSocket();
  const { addToast } = useToast();

  // Queries
  const { data, loading, refetch } = useQuery(BOARD_QUERY, {
    variables: { id: boardId },
  });

  // Mutations
  const [updateTask] = useMutation(UPDATE_TASK_MUTATION);
  const [updateColumn] = useMutation(UPDATE_COLUMN_MUTATION);
  const [createColumn] = useMutation(CREATE_COLUMN_MUTATION);
  const [deleteColumn] = useMutation(DELETE_COLUMN_MUTATION);
  const [createTask] = useMutation(CREATE_TASK_MUTATION);
  const [deleteTask] = useMutation(DELETE_TASK_MUTATION);
  const [addMember] = useMutation(ADD_BOARD_MEMBER_MUTATION);
  const [removeMember] = useMutation(REMOVE_BOARD_MEMBER_MUTATION);
  const [assignUser] = useMutation(ASSIGN_USER_MUTATION);
  const [unassignUser] = useMutation(UNASSIGN_USER_MUTATION);
  const [addComment] = useMutation(ADD_COMMENT_MUTATION);
  const [deleteComment] = useMutation(DELETE_COMMENT_MUTATION);
  const [createLabel] = useMutation(CREATE_LABEL_MUTATION);
  const [addLabelToTask] = useMutation(ADD_LABEL_TO_TASK_MUTATION);
  const [removeLabelFromTask] = useMutation(REMOVE_LABEL_FROM_TASK_MUTATION);

  // States
  const [columns, setColumns] = useState<Column[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Modals
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [colTitle, setColTitle] = useState('');
  
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW'|'MEDIUM'|'HIGH'|'URGENT'>('MEDIUM');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  
  const [commentText, setCommentText] = useState('');

  // Confirm dialogs
  const [confirmDeleteColumn, setConfirmDeleteColumn] = useState<string | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<string | null>(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState<string | null>(null);

  // Task detail modal tab
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');

  // Inline editing in task detail modal
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescValue, setEditDescValue] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);
  const [assigneeFilters, setAssigneeFilters] = useState<string[]>([]);
  const [labelFilters, setLabelFilters] = useState<string[]>([]);

  // Socket Setup
  useEffect(() => {
    if (boardId) {
      joinBoard(boardId);
    }
    return () => {
      leaveBoard();
    };
  }, [boardId]);

  // Handle Socket broadcasts for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handler = () => {
      refetch();
    };

    socket.on('taskCreated', handler);
    socket.on('taskUpdated', handler);
    socket.on('taskDeleted', handler);
    socket.on('columnCreated', handler);
    socket.on('columnUpdated', handler);
    socket.on('columnDeleted', handler);
    socket.on('commentAdded', handler);
    socket.on('commentDeleted', handler);

    return () => {
      socket.off('taskCreated', handler);
      socket.off('taskUpdated', handler);
      socket.off('taskDeleted', handler);
      socket.off('columnCreated', handler);
      socket.off('columnUpdated', handler);
      socket.off('columnDeleted', handler);
      socket.off('commentAdded', handler);
      socket.off('commentDeleted', handler);
    };
  }, [socket, refetch]);

  // Sync columns local state with query details
  useEffect(() => {
    if (data?.board?.columns) {
      const sortedCols = [...data.board.columns].map(col => ({
        ...col,
        tasks: [...col.tasks].sort((a: any, b: any) => a.position - b.position)
      })).sort((a: any, b: any) => a.position - b.position);
      setColumns(sortedCols);
    }
  }, [data]);

  // Sync selected task modal state on updates
  useEffect(() => {
    if (selectedTask && data?.board?.columns) {
      for (const col of data.board.columns) {
        const found = col.tasks.find((t: any) => t.id === selectedTask.id);
        if (found) {
          setSelectedTask(found);
          break;
        }
      }
    }
  }, [data]);

  // Filter logic
  const isTaskDimmed = useCallback((task: Task): boolean => {
    const hasFilters = searchQuery || priorityFilters.length > 0 || assigneeFilters.length > 0 || labelFilters.length > 0;
    if (!hasFilters) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(q) && !task.description?.toLowerCase().includes(q)) return true;
    }
    if (priorityFilters.length > 0 && !priorityFilters.includes(task.priority)) return true;
    if (assigneeFilters.length > 0 && !task.assignees.some(a => assigneeFilters.includes(a.id))) return true;
    if (labelFilters.length > 0 && !task.labels.some(l => labelFilters.includes(l.id))) return true;
    
    return false;
  }, [searchQuery, priorityFilters, assigneeFilters, labelFilters]);

  // Available filter options
  const availableAssignees = useMemo(() => {
    return (data?.board?.members || []).map((m: any) => ({
      id: m.user.id,
      label: m.user.name,
    }));
  }, [data]);

  const availableLabels = useMemo(() => {
    return (data?.board?.labels || []).map((l: any) => ({
      id: l.id,
      label: l.name,
      color: l.color,
    }));
  }, [data]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const isActiveCol = active.data.current?.type === 'column';
    
    if (isActiveCol) {
      if (activeId === overId) return;
      const oldIndex = columns.findIndex(c => c.id === activeId);
      const newIndex = columns.findIndex(c => c.id === overId);

      const reordered = arrayMove(columns, oldIndex, newIndex);
      setColumns(reordered);

      let newPos = 1000.0;
      if (newIndex === 0) {
        newPos = reordered[1] ? reordered[1].position / 2 : 1000.0;
      } else if (newIndex === reordered.length - 1) {
        newPos = reordered[newIndex - 1].position + 1000.0;
      } else {
        newPos = (reordered[newIndex - 1].position + reordered[newIndex + 1].position) / 2;
      }

      await updateColumn({
        variables: { id: activeId, position: newPos },
        optimisticResponse: {
          updateColumn: {
            id: activeId,
            position: newPos,
            title: columns[oldIndex].title,
            __typename: 'Column'
          }
        }
      });
      refetch();
    } else {
      const activeTask = active.data.current?.task as Task;
      if (!activeTask) return;

      let overColId = '';
      let overTaskIndex = -1;

      const isOverCol = over.data.current?.type === 'column';
      
      if (isOverCol) {
        overColId = overId;
      } else {
        const parentCol = columns.find(c => c.tasks.some(t => t.id === overId));
        if (parentCol) {
          overColId = parentCol.id;
          overTaskIndex = parentCol.tasks.findIndex(t => t.id === overId);
        }
      }

      if (!overColId) return;

      const sourceCol = columns.find(c => c.tasks.some(t => t.id === activeId));
      if (!sourceCol) return;

      const sourceTasks = [...sourceCol.tasks];
      const targetColIndex = columns.findIndex(c => c.id === overColId);
      const targetTasks = [...columns[targetColIndex].tasks];

      const activeIndex = sourceTasks.findIndex(t => t.id === activeId);
      
      if (sourceCol.id === overColId) {
        if (activeIndex === overTaskIndex) return;
        const reorderedTasks = arrayMove(sourceTasks, activeIndex, overTaskIndex);
        
        let newPos = 1000.0;
        if (overTaskIndex === 0) {
          newPos = reorderedTasks[1] ? reorderedTasks[1].position / 2 : 1000.0;
        } else if (overTaskIndex === reorderedTasks.length - 1) {
          newPos = reorderedTasks[overTaskIndex - 1].position + 1000.0;
        } else {
          newPos = (reorderedTasks[overTaskIndex - 1].position + reorderedTasks[overTaskIndex + 1].position) / 2;
        }

        reorderedTasks[overTaskIndex].position = newPos;
        
        const updatedCols = columns.map(c => c.id === sourceCol.id ? { ...c, tasks: reorderedTasks } : c);
        setColumns(updatedCols);

        await updateTask({
          variables: { id: activeId, position: newPos },
        });
      } else {
        sourceTasks.splice(activeIndex, 1);
        
        let newPos = 1000.0;
        if (overTaskIndex === -1 || overTaskIndex === targetTasks.length) {
          newPos = targetTasks.length > 0 ? targetTasks[targetTasks.length - 1].position + 1000.0 : 1000.0;
          targetTasks.push({ ...activeTask, position: newPos });
        } else {
          const prevPos = targetTasks[overTaskIndex - 1] ? targetTasks[overTaskIndex - 1].position : 0;
          const nextPos = targetTasks[overTaskIndex].position;
          newPos = (prevPos + nextPos) / 2;
          targetTasks.splice(overTaskIndex, 0, { ...activeTask, position: newPos });
        }

        const updatedCols = columns.map(c => {
          if (c.id === sourceCol.id) return { ...c, tasks: sourceTasks };
          if (c.id === overColId) return { ...c, tasks: targetTasks };
          return c;
        });
        setColumns(updatedCols);

        await updateTask({
          variables: { id: activeId, columnId: overColId, position: newPos },
        });
      }
      refetch();
    }
  };

  const handleAddColumnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colTitle.trim()) return;

    await createColumn({
      variables: {
        boardId,
        title: colTitle.trim(),
        position: columns.length * 1000.0 + 1000.0
      }
    });
    setColTitle('');
    setShowAddColumn(false);
    refetch();
    addToast({ type: 'success', title: 'Column created', message: `"${colTitle.trim()}" added to the board.` });
  };

  const handleRenameColumn = async (columnId: string, newTitle: string) => {
    await updateColumn({ variables: { id: columnId, title: newTitle } });
    refetch();
    addToast({ type: 'info', title: 'Column renamed' });
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !showAddTask) return;

    await createTask({
      variables: {
        columnId: showAddTask,
        title: taskTitle.trim(),
        priority: taskPriority
      }
    });
    setTaskTitle('');
    setTaskPriority('MEDIUM');
    setShowAddTask(null);
    refetch();
    addToast({ type: 'success', title: 'Task created' });
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      await addMember({
        variables: {
          boardId,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole
        }
      });
      setInviteEmail('');
      setShowInviteModal(false);
      refetch();
      addToast({ type: 'success', title: 'Member invited', message: `${inviteEmail.trim()} has been added.` });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to invite user', message: 'Make sure the email is registered.' });
    }
  };

  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    await addComment({
      variables: {
        taskId: selectedTask.id,
        text: commentText.trim()
      }
    });
    setCommentText('');
    refetch();
  };

  const handleToggleAssign = async (userId: string, isAssigned: boolean) => {
    if (!selectedTask) return;
    if (isAssigned) {
      await unassignUser({ variables: { taskId: selectedTask.id, userId } });
    } else {
      await assignUser({ variables: { taskId: selectedTask.id, userId } });
    }
    refetch();
  };

  const handleToggleLabel = async (labelId: string, isTagged: boolean) => {
    if (!selectedTask) return;
    if (isTagged) {
      await removeLabelFromTask({ variables: { taskId: selectedTask.id, labelId } });
    } else {
      await addLabelToTask({ variables: { taskId: selectedTask.id, labelId } });
    }
    refetch();
  };

  // Inline editing handlers
  const handleSaveTitle = async () => {
    if (!selectedTask || !editTitleValue.trim()) return;
    if (editTitleValue.trim() !== selectedTask.title) {
      await updateTask({ variables: { id: selectedTask.id, title: editTitleValue.trim() } });
      refetch();
    }
    setEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (!selectedTask) return;
    if (editDescValue !== (selectedTask.description || '')) {
      await updateTask({ variables: { id: selectedTask.id, description: editDescValue } });
      refetch();
    }
    setEditingDescription(false);
  };

  const handleUpdatePriority = async (newPriority: string) => {
    if (!selectedTask) return;
    await updateTask({ variables: { id: selectedTask.id, priority: newPriority } });
    refetch();
  };

  const handleUpdateDueDate = async (newDate: string) => {
    if (!selectedTask) return;
    await updateTask({ variables: { id: selectedTask.id, dueDate: newDate || null } });
    refetch();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading board">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-slate-400 font-semibold text-sm">Loading board...</span>
        </div>
      </div>
    );
  }

  const board = data?.board;

  return (
    <div className="min-h-screen flex flex-col" id="main-content">
      {/* Board Header */}
      <header className="glass-panel border-b border-white/5 py-4 px-6 sticky top-0 z-20" role="banner">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="font-extrabold text-xl text-white tracking-tight flex items-center gap-2">
                  {board?.title}
                  {board?.isPublic && (
                    <span className="text-[10px] text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                      Public
                    </span>
                  )}
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">{board?.description || 'No description'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Viewers roster presence */}
              {presenceUsers.length > 0 && (
                <div className="flex items-center gap-1.5" aria-label="Users currently viewing this board">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider hidden sm:inline">Online:</span>
                  <div className="flex -space-x-1.5">
                    {presenceUsers.map(pu => (
                      <div 
                        key={pu.userId} 
                        className="w-7 h-7 rounded-full bg-indigo-500/20 border-2 border-indigo-500 flex items-center justify-center text-[9px] text-white font-extrabold presence-dot"
                        title={`${pu.name} (${pu.email})`}
                        aria-label={`${pu.name} is viewing`}
                      >
                        {pu.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition border border-white/5"
                aria-label="Invite a member to this board"
              >
                <UserPlus className="w-3.5 h-3.5" /> Invite
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <SearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            priorityFilters={priorityFilters}
            onPriorityChange={setPriorityFilters}
            assigneeFilters={assigneeFilters}
            onAssigneeChange={setAssigneeFilters}
            labelFilters={labelFilters}
            onLabelChange={setLabelFilters}
            availableAssignees={availableAssignees}
            availableLabels={availableLabels}
          />
        </div>
      </header>

      {/* Kanban lanes Area */}
      <main className="flex-1 overflow-x-auto p-6 max-w-[1600px] mx-auto w-full" role="region" aria-label="Kanban board">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="kanban-board-scroll items-start">
            <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {columns.map((column) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  onAddTask={(cid) => { setShowAddTask(cid); setTaskTitle(''); }}
                  onDeleteColumn={(cid) => setConfirmDeleteColumn(cid)}
                  onTaskClick={(task) => { setSelectedTask(task); setActiveTab('details'); setEditingTitle(false); setEditingDescription(false); }}
                  onRenameColumn={handleRenameColumn}
                  isTaskDimmed={isTaskDimmed}
                />
              ))}
            </SortableContext>

            {/* Add Column */}
            {showAddColumn ? (
              <form onSubmit={handleAddColumnSubmit} className="w-80 shrink-0 glass-panel rounded-2xl p-4 space-y-3 animate-scale-in">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Column title..."
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  className="w-full pl-3 pr-4 py-2 rounded-xl glass-input text-xs"
                  onKeyDown={(e) => { if (e.key === 'Escape') setShowAddColumn(false); }}
                  aria-label="New column title"
                />
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1.5 bg-indigo-500 rounded-lg text-white font-semibold text-xs transition">
                    Create
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowAddColumn(false)}
                    className="px-3 py-1.5 bg-white/5 rounded-lg text-slate-300 font-semibold text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddColumn(true)}
                className="w-80 shrink-0 h-14 border border-dashed border-white/10 hover:border-indigo-500/30 rounded-2xl flex items-center justify-center gap-1.5 text-slate-400 hover:text-indigo-400 transition bg-transparent"
                aria-label="Add a new column"
              >
                <Plus className="w-4 h-4" /> Add Column
              </button>
            )}
          </div>
        </DndContext>
      </main>

      {/* Task Creation Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm modal-overlay" onClick={() => setShowAddTask(null)} role="presentation">
          <div
            className="w-full max-w-sm glass-panel p-6 rounded-2xl relative shadow-2xl modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-task-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="create-task-title" className="text-lg font-bold text-white mb-4">Create New Task</h3>
            <form onSubmit={handleAddTaskSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="new-task-title" className="text-xs text-slate-300 font-semibold uppercase block">Task Title</label>
                <input
                  id="new-task-title"
                  type="text"
                  required
                  autoFocus
                  placeholder="Task title..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="new-task-priority" className="text-xs text-slate-300 font-semibold uppercase block">Priority</label>
                <select
                  id="new-task-priority"
                  value={taskPriority}
                  onChange={(e: any) => setTaskPriority(e.target.value)}
                  className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900 border border-white/10"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTask(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-sm text-slate-300 transition"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-semibold text-sm text-white transition shadow-lg shadow-indigo-500/20">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Board Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm modal-overlay" onClick={() => setShowInviteModal(false)} role="presentation">
          <div
            className="w-full max-w-sm glass-panel p-6 rounded-2xl relative shadow-2xl modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-member-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="invite-member-title" className="text-lg font-bold text-white mb-4">Invite Member to Board</h3>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="invite-email" className="text-xs text-slate-300 font-semibold uppercase block">User Email Address</label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="user@domain.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="invite-role" className="text-xs text-slate-300 font-semibold uppercase block">Role</label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm bg-slate-900 border border-white/10"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-sm text-slate-300 transition"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-semibold text-sm text-white transition shadow-lg shadow-indigo-500/20">
                  Invite Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto modal-overlay"
          onClick={() => setSelectedTask(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-2xl glass-panel p-6 rounded-2xl relative shadow-2xl my-8 modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
              aria-label="Close task details"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-5">
              {/* Header - Editable Title */}
              <div>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Task Details</span>
                {editingTitle ? (
                  <input
                    type="text"
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') setEditingTitle(false);
                    }}
                    className="inline-edit w-full text-xl font-extrabold text-white mt-1 leading-snug"
                    autoFocus
                    aria-label="Edit task title"
                  />
                ) : (
                  <h2
                    id="task-detail-title"
                    className="text-xl font-extrabold text-white mt-1 leading-snug cursor-pointer hover:text-indigo-400 transition-colors group/title flex items-center gap-2"
                    onClick={() => { setEditTitleValue(selectedTask.title); setEditingTitle(true); }}
                  >
                    {selectedTask.title}
                    <Pencil className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover/title:opacity-100 transition" aria-hidden="true" />
                  </h2>
                )}

                {/* Editable Description */}
                {editingDescription ? (
                  <textarea
                    value={editDescValue}
                    onChange={(e) => setEditDescValue(e.target.value)}
                    onBlur={handleSaveDescription}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditingDescription(false);
                    }}
                    className="inline-edit w-full text-sm text-slate-300 mt-3 leading-relaxed min-h-[60px] resize-none"
                    autoFocus
                    placeholder="Add a description..."
                    aria-label="Edit task description"
                  />
                ) : (
                  <p
                    className="text-slate-300 text-sm mt-3 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer hover:border-indigo-500/20 transition group/desc flex items-start gap-2 min-h-[44px]"
                    onClick={() => { setEditDescValue(selectedTask.description || ''); setEditingDescription(true); }}
                  >
                    <span className="flex-1">{selectedTask.description || 'Click to add a description...'}</span>
                    <Pencil className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover/desc:opacity-100 transition shrink-0 mt-0.5" aria-hidden="true" />
                  </p>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-6 border-b border-white/5" role="tablist">
                <button
                  role="tab"
                  aria-selected={activeTab === 'details'}
                  onClick={() => setActiveTab('details')}
                  className={`pb-3 text-sm font-semibold transition ${activeTab === 'details' ? 'tab-active' : 'tab-inactive'}`}
                >
                  Details
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'comments'}
                  onClick={() => setActiveTab('comments')}
                  className={`pb-3 text-sm font-semibold transition flex items-center gap-1.5 ${activeTab === 'comments' ? 'tab-active' : 'tab-inactive'}`}
                >
                  <MessageSquare className="w-4 h-4" aria-hidden="true" /> Comments
                  {selectedTask.comments?.length > 0 && (
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{selectedTask.comments.length}</span>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" role="tabpanel">
                  {/* Column 1 - Priority & Due Date */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-2">Priority</h4>
                      <select
                        value={selectedTask.priority}
                        onChange={(e) => handleUpdatePriority(e.target.value)}
                        className="w-full pl-3 pr-4 py-2 rounded-xl glass-input text-xs bg-slate-900 border border-white/10 font-semibold"
                        aria-label="Change priority"
                      >
                        <option value="LOW">🟢 Low</option>
                        <option value="MEDIUM">🔵 Medium</option>
                        <option value="HIGH">🟠 High</option>
                        <option value="URGENT">🔴 Urgent</option>
                      </select>
                    </div>
                    <div>
                      <h4 className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-2">Due Date</h4>
                      <input
                        type="date"
                        value={selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleUpdateDueDate(e.target.value)}
                        className="w-full pl-3 pr-3 py-2 rounded-xl glass-input text-xs"
                        aria-label="Set due date"
                      />
                    </div>
                  </div>

                  {/* Column 2 - Assignees */}
                  <div>
                    <h4 className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-3 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" aria-hidden="true" /> Assignees
                    </h4>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {board?.members?.map((m: any) => {
                        const isAssigned = selectedTask.assignees.some((a: any) => a.id === m.user.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => handleToggleAssign(m.user.id, isAssigned)}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition border ${
                              isAssigned 
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 font-semibold' 
                                : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'
                            }`}
                            aria-pressed={isAssigned}
                            aria-label={`${isAssigned ? 'Unassign' : 'Assign'} ${m.user.name}`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 flex items-center justify-center text-[8px] text-white font-bold">
                                {m.user.name.charAt(0).toUpperCase()}
                              </span>
                              {m.user.name}
                            </span>
                            {isAssigned && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 3 - Labels */}
                  <div>
                    <h4 className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-3 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" aria-hidden="true" /> Labels
                    </h4>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {board?.labels?.map((l: any) => {
                        const isTagged = selectedTask.labels.some((t: any) => t.id === l.id);
                        return (
                          <button
                            key={l.id}
                            onClick={() => handleToggleLabel(l.id, isTagged)}
                            style={{ borderColor: isTagged ? l.color : 'rgba(255, 255, 255, 0.05)', backgroundColor: isTagged ? `${l.color}15` : 'transparent' }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition border ${
                              isTagged 
                                ? 'text-white font-semibold' 
                                : 'text-slate-400 hover:bg-white/5'
                            }`}
                            aria-pressed={isTagged}
                            aria-label={`${isTagged ? 'Remove' : 'Add'} label ${l.name}`}
                          >
                            <span className="flex items-center gap-2">
                              <span style={{ backgroundColor: l.color }} className="w-2.5 h-2.5 rounded-full" aria-hidden="true" />
                              {l.name}
                            </span>
                            {isTagged && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                      {(!board?.labels || board.labels.length === 0) && (
                        <p className="text-slate-500 text-xs">No labels defined for this board.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="space-y-4 animate-slide-up" role="tabpanel">
                  <form onSubmit={handleAddCommentSubmit} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 flex items-center justify-center text-[10px] text-white font-bold shrink-0 mt-0.5">
                      {user?.name.charAt(0).toUpperCase()}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 pl-3 pr-4 py-2 rounded-xl glass-input text-xs"
                      aria-label="Add a comment"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-semibold text-xs text-white transition active:scale-[0.98]"
                    >
                      Post
                    </button>
                  </form>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {selectedTask.comments?.length === 0 ? (
                      <div className="text-center text-slate-500 text-xs py-6">
                        <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-30" aria-hidden="true" />
                        No comments yet. Start the conversation!
                      </div>
                    ) : (
                      selectedTask.comments?.map((comment: any) => (
                        <div key={comment.id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between gap-3 items-start group/comment">
                          <div className="flex gap-3 flex-1">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 flex items-center justify-center text-[8px] text-white font-bold shrink-0 mt-0.5">
                              {comment.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                                <span>{comment.user.name}</span>
                                <span className="text-[9px] text-slate-500 font-normal">
                                  {new Date(parseInt(comment.createdAt) || Date.now()).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-slate-400 leading-relaxed">{comment.text}</p>
                            </div>
                          </div>
                          {comment.user.id === user?.id && (
                            <button
                              onClick={() => setConfirmDeleteComment(comment.id)}
                              className="text-slate-500 hover:text-red-400 transition p-1 rounded hover:bg-white/5 shrink-0 opacity-0 group-hover/comment:opacity-100"
                              aria-label="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Task Deletion */}
              <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                <button
                  onClick={() => setConfirmDeleteTask(selectedTask.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-red-500/10 text-red-500 hover:text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition"
                  aria-label="Delete this task"
                >
                  <Trash2 className="w-4 h-4" /> Delete Task
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-xs text-slate-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!confirmDeleteColumn}
        title="Delete Column"
        message="Are you sure you want to delete this column and all its tasks? This action cannot be undone."
        confirmLabel="Delete Column"
        variant="danger"
        onConfirm={async () => {
          if (confirmDeleteColumn) {
            await deleteColumn({ variables: { id: confirmDeleteColumn } });
            refetch();
            addToast({ type: 'success', title: 'Column deleted' });
          }
          setConfirmDeleteColumn(null);
        }}
        onCancel={() => setConfirmDeleteColumn(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmDeleteTask}
        title="Delete Task"
        message="Are you sure you want to permanently delete this task card? This action cannot be undone."
        confirmLabel="Delete Task"
        variant="danger"
        onConfirm={async () => {
          if (confirmDeleteTask) {
            await deleteTask({ variables: { id: confirmDeleteTask } });
            setSelectedTask(null);
            refetch();
            addToast({ type: 'success', title: 'Task deleted' });
          }
          setConfirmDeleteTask(null);
        }}
        onCancel={() => setConfirmDeleteTask(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmDeleteComment}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => {
          if (confirmDeleteComment) {
            await deleteComment({ variables: { id: confirmDeleteComment } });
            refetch();
          }
          setConfirmDeleteComment(null);
        }}
        onCancel={() => setConfirmDeleteComment(null)}
      />
    </div>
  );
};

export default BoardView;
