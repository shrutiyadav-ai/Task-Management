import React, { useEffect, useState } from 'react';
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
import { 
  DndContext, 
  DragEndEvent, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  KeyboardSensor,
  closestCorners
} from '@dnd-kit/core';
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
  Tag, ShieldAlert, Circle, UserPlus, Globe, Check, AlertCircle, Trash
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
}

interface Column {
  id: string;
  title: string;
  position: number;
  tasks: Task[];
}

// --- Sortable Column Component ---
const SortableColumn: React.FC<{
  column: Column;
  onAddTask: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onTaskClick: (task: Task) => void;
}> = ({ column, onAddTask, onDeleteColumn, onTaskClick }) => {
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

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="w-80 shrink-0 glass-panel rounded-2xl p-4 flex flex-col h-[calc(100vh-12rem)]"
    >
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex-1">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider select-none truncate">
            {column.title}
          </h3>
        </div>
        <button 
          onClick={() => onDeleteColumn(column.id)}
          className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
        {column.tasks.length === 0 && (
          <div className="h-16 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-slate-500 text-xs select-none">
            No tasks here
          </div>
        )}
      </div>

      <button
        onClick={() => onAddTask(column.id)}
        className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-indigo-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-98"
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
}> = ({ task, onClick }) => {
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
    opacity: isDragging ? 0.3 : 1,
  };

  const priorityColors = {
    LOW: 'bg-green-500/10 text-green-400 border-green-500/20',
    MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    URGENT: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="glass-card p-4 rounded-xl cursor-pointer select-none space-y-3 relative group"
    >
      <div {...attributes} {...listeners} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"></div>
      
      <div className="relative z-10 space-y-3">
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

        <h4 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors leading-snug">
          {task.title}
        </h4>

        {task.description && (
          <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-1 text-[10px]">
          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>

          <div className="flex items-center gap-3 text-slate-500">
            {task.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
              </span>
            )}
            
            {task.assignees.length > 0 && (
              <div className="flex -space-x-1">
                {task.assignees.map((asg) => (
                  <div 
                    key={asg.id} 
                    className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] text-white font-bold border border-slate-900"
                    title={asg.name}
                  >
                    {asg.name.charAt(0).toUpperCase()}
                  </div>
                ))}
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
  
  // Modals / Dropdowns toggles
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [colTitle, setColTitle] = useState('');
  
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW'|'MEDIUM'|'HIGH'|'URGENT'>('MEDIUM');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  
  const [commentText, setCommentText] = useState('');

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
      // Deep clone to safely manipulate sort state
      const sortedCols = [...data.board.columns].map(col => ({
        ...col,
        tasks: [...col.tasks].sort((a, b) => a.position - b.position)
      })).sort((a, b) => a.position - b.position);
      setColumns(sortedCols);
    }
  }, [data]);

  // Sync selected task modal state on updates
  useEffect(() => {
    if (selectedTask && data?.board?.columns) {
      // Find matching task inside fresh data to update modal
      for (const col of data.board.columns) {
        const found = col.tasks.find((t: any) => t.id === selectedTask.id);
        if (found) {
          setSelectedTask(found);
          break;
        }
      }
    }
  }, [data, selectedTask]);

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

    // Check if dragging column or task
    const isActiveCol = active.data.current?.type === 'column';
    
    if (isActiveCol) {
      if (activeId === overId) return;
      const oldIndex = columns.findIndex(c => c.id === activeId);
      const newIndex = columns.findIndex(c => c.id === overId);

      const reordered = arrayMove(columns, oldIndex, newIndex);
      setColumns(reordered);

      // Recalculate position float coefficient
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
      // Dragging a task card
      const activeTask = active.data.current?.task as Task;
      if (!activeTask) return;

      // Find which column the target is in
      let overColId = '';
      let overTaskIndex = -1;

      // Check if dropped directly over a column container or a task card
      const isOverCol = over.data.current?.type === 'column';
      
      if (isOverCol) {
        overColId = overId;
      } else {
        // Find column containing the target task card
        const parentCol = columns.find(c => c.tasks.some(t => t.id === overId));
        if (parentCol) {
          overColId = parentCol.id;
          overTaskIndex = parentCol.tasks.findIndex(t => t.id === overId);
        }
      }

      if (!overColId) return;

      const sourceCol = columns.find(c => c.tasks.some(t => t.id === activeId));
      if (!sourceCol) return;

      // Move task local state
      const sourceTasks = [...sourceCol.tasks];
      const targetColIndex = columns.findIndex(c => c.id === overColId);
      const targetTasks = [...columns[targetColIndex].tasks];

      const activeIndex = sourceTasks.findIndex(t => t.id === activeId);
      
      if (sourceCol.id === overColId) {
        // Reordering in same column
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

        // Apply position
        reorderedTasks[overTaskIndex].position = newPos;
        
        const updatedCols = columns.map(c => c.id === sourceCol.id ? { ...c, tasks: reorderedTasks } : c);
        setColumns(updatedCols);

        await updateTask({
          variables: { id: activeId, position: newPos },
        });
      } else {
        // Moving to a different column
        sourceTasks.splice(activeIndex, 1);
        
        let newPos = 1000.0;
        if (overTaskIndex === -1 || overTaskIndex === targetTasks.length) {
          // Drop at end
          newPos = targetTasks.length > 0 ? targetTasks[targetTasks.length - 1].position + 1000.0 : 1000.0;
          targetTasks.push({ ...activeTask, position: newPos });
        } else {
          // Drop at index
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
    } catch (err) {
      alert('Error inviting user.');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 font-semibold text-sm animate-pulse">Loading board lanes...</div>
      </div>
    );
  }

  const board = data?.board;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sub Header */}
      <header className="glass-panel border-b border-white/5 py-4 px-6 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-extrabold text-xl text-white tracking-tight flex items-center gap-2">
                {board?.title}
                {board?.isPublic && <span className="text-[10px] text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Public</span>}
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">{board?.description || 'No description'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Viewers roster presence */}
            {presenceUsers.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Viewing Now:</span>
                <div className="flex -space-x-1">
                  {presenceUsers.map(pu => (
                    <div 
                      key={pu.userId} 
                      className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center text-[9px] text-white font-extrabold"
                      title={`${pu.name} (${pu.email})`}
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
            >
              <UserPlus className="w-3.5 h-3.5" /> Invite User
            </button>
          </div>
        </div>
      </header>

      {/* Kanban lanes Area */}
      <main className="flex-1 overflow-x-auto p-6 max-w-7xl mx-auto w-full">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="kanban-board-scroll items-start">
            <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {columns.map((column) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  onAddTask={(cid) => { setShowAddTask(cid); setTaskTitle(''); }}
                  onDeleteColumn={async (cid) => { 
                    if (confirm('Delete this column and all its tasks?')) {
                      await deleteColumn({ variables: { id: cid } }); 
                      refetch();
                    }
                  }}
                  onTaskClick={(task) => setSelectedTask(task)}
                />
              ))}
            </SortableContext>

            {/* Spawn Column Card */}
            {showAddColumn ? (
              <form onSubmit={handleAddColumnSubmit} className="w-80 shrink-0 glass-panel rounded-2xl p-4 space-y-3">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Column title..."
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  className="w-full pl-3 pr-4 py-2 rounded-xl glass-input text-xs"
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
              >
                <Plus className="w-4 h-4" /> Add Column
              </button>
            )}
          </div>
        </DndContext>
      </main>

      {/* Task Creation Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel p-6 rounded-2xl relative shadow-2xl animate-pulse-slow">
            <h3 className="text-lg font-bold text-white mb-4">Create New Task</h3>
            <form onSubmit={handleAddTaskSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold uppercase">Task Title</label>
                <input
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
                <label className="text-xs text-slate-300 font-semibold uppercase">Priority</label>
                <select
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
                <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-semibold text-sm text-white transition">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Board Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel p-6 rounded-2xl relative shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Invite Member to Board</h3>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold uppercase">User Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@domain.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold uppercase">Role</label>
                <select
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
                <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-semibold text-sm text-white transition">
                  Invite Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl glass-panel p-6 rounded-2xl relative shadow-2xl my-8">
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Task Lane Details</span>
                <h2 className="text-xl font-extrabold text-white mt-1 leading-snug">{selectedTask.title}</h2>
                {selectedTask.description && <p className="text-slate-300 text-sm mt-3 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">{selectedTask.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-y border-white/5 py-6">
                {/* Column 1 - Priority & Due Date */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-2">Priority</h4>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {selectedTask.priority}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-2">Due Date</h4>
                    <span className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'No due date'}
                    </span>
                  </div>
                </div>

                {/* Column 2 - Assignees */}
                <div>
                  <h4 className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-3">Assignees</h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {board?.members?.map((m: any) => {
                      const isAssigned = selectedTask.assignees.some(a => a.id === m.user.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleToggleAssign(m.user.id, isAssigned)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition border ${
                            isAssigned 
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 font-semibold' 
                              : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'
                          }`}
                        >
                          <span>{m.user.name}</span>
                          {isAssigned && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column 3 - Labels */}
                <div>
                  <h4 className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-3">Labels</h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {board?.labels?.map((l: any) => {
                      const isTagged = selectedTask.labels.some(t => t.id === l.id);
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
                        >
                          <span className="flex items-center gap-2">
                            <span style={{ backgroundColor: l.color }} className="w-2.5 h-2.5 rounded-full"></span>
                            {l.name}
                          </span>
                          {isTagged && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-4">
                <h3 className="font-bold text-white text-md flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-400" /> Comments
                </h3>
                
                <form onSubmit={handleAddCommentSubmit} className="flex gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 pl-3 pr-4 py-2 rounded-xl glass-input text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-semibold text-xs text-white transition active:scale-98"
                  >
                    Post
                  </button>
                </form>

                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {selectedTask.comments.length === 0 ? (
                    <div className="text-center text-slate-500 text-xs py-4">No comments yet</div>
                  ) : (
                    selectedTask.comments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between gap-3 items-start group">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-300 font-semibold">
                            <span>{comment.user.name}</span>
                            <span className="text-[9px] text-slate-500 font-normal">
                              {new Date(parseInt(comment.createdAt) || Date.now()).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-slate-400 leading-relaxed">{comment.text}</p>
                        </div>
                        {comment.user.id === user?.id && (
                          <button
                            onClick={async () => {
                              await deleteComment({ variables: { id: comment.id } });
                              refetch();
                            }}
                            className="text-slate-500 hover:text-red-400 transition p-1 rounded hover:bg-white/5 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Task Deletion */}
              <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                <button
                  onClick={async () => {
                    if (confirm('Delete this task card permanently?')) {
                      await deleteTask({ variables: { id: selectedTask.id } });
                      setSelectedTask(null);
                      refetch();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-red-500/10 text-red-500 hover:text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete Task Card
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-xs text-slate-300 transition"
                >
                  Close Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardView;
