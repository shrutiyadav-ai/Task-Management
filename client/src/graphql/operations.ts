import { gql } from '@apollo/client';

// Authentication
export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
      avatarUrl
      createdAt
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        name
        avatarUrl
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($email: String!, $password: String!, $name: String!) {
    register(email: $email, password: $password, name: $name) {
      token
      user {
        id
        email
        name
        avatarUrl
      }
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($name: String, $avatarUrl: String) {
    updateProfile(name: $name, avatarUrl: $avatarUrl) {
      id
      name
      avatarUrl
    }
  }
`;

// Boards
export const BOARDS_QUERY = gql`
  query Boards {
    boards {
      id
      title
      description
      isPublic
      createdAt
    }
  }
`;

export const BOARD_QUERY = gql`
  query Board($id: ID!) {
    board(id: $id) {
      id
      title
      description
      isPublic
      createdAt
      members {
        id
        role
        user {
          id
          email
          name
          avatarUrl
        }
      }
      columns {
        id
        title
        position
        tasks {
          id
          title
          description
          position
          priority
          dueDate
          labels {
            id
            name
            color
          }
          assignees {
            id
            email
            name
            avatarUrl
          }
          comments {
            id
            text
            createdAt
            user {
              id
              name
              avatarUrl
            }
          }
        }
      }
      labels {
        id
        name
        color
      }
    }
  }
`;

export const CREATE_BOARD_MUTATION = gql`
  mutation CreateBoard($title: String!, $description: String) {
    createBoard(title: $title, description: $description) {
      id
      title
      description
      isPublic
      createdAt
    }
  }
`;

export const UPDATE_BOARD_MUTATION = gql`
  mutation UpdateBoard($id: ID!, $title: String, $description: String, $isPublic: Boolean) {
    updateBoard(id: $id, title: $title, description: $description, isPublic: $isPublic) {
      id
      title
      description
      isPublic
    }
  }
`;

export const DELETE_BOARD_MUTATION = gql`
  mutation DeleteBoard($id: ID!) {
    deleteBoard(id: $id)
  }
`;

// Board Members
export const ADD_BOARD_MEMBER_MUTATION = gql`
  mutation AddBoardMember($boardId: ID!, $email: String!, $role: BoardRole!) {
    addBoardMember(boardId: $boardId, email: $email, role: $role) {
      id
      role
      user {
        id
        email
        name
        avatarUrl
      }
    }
  }
`;

export const REMOVE_BOARD_MEMBER_MUTATION = gql`
  mutation RemoveBoardMember($boardId: ID!, $userId: ID!) {
    removeBoardMember(boardId: $boardId, userId: $userId)
  }
`;

// Columns
export const CREATE_COLUMN_MUTATION = gql`
  mutation CreateColumn($boardId: ID!, $title: String!, $position: Float!) {
    createColumn(boardId: $boardId, title: $title, position: $position) {
      id
      title
      position
      tasks {
        id
      }
    }
  }
`;

export const UPDATE_COLUMN_MUTATION = gql`
  mutation UpdateColumn($id: ID!, $title: String, $position: Float) {
    updateColumn(id: $id, title: $title, position: $position) {
      id
      title
      position
    }
  }
`;

export const DELETE_COLUMN_MUTATION = gql`
  mutation DeleteColumn($id: ID!) {
    deleteColumn(id: $id)
  }
`;

// Tasks
export const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($columnId: ID!, $title: String!, $description: String, $priority: TaskPriority, $dueDate: String) {
    createTask(columnId: $columnId, title: $title, description: $description, priority: $priority, dueDate: $dueDate) {
      id
      title
      description
      position
      priority
      dueDate
      labels {
        id
      }
      assignees {
        id
      }
    }
  }
`;

export const UPDATE_TASK_MUTATION = gql`
  mutation UpdateTask(
    $id: ID!
    $columnId: ID
    $title: String
    $description: String
    $position: Float
    $priority: TaskPriority
    $dueDate: String
  ) {
    updateTask(
      id: $id
      columnId: $columnId
      title: $title
      description: $description
      position: $position
      priority: $priority
      dueDate: $dueDate
    ) {
      id
      title
      description
      position
      priority
      dueDate
      columnId
    }
  }
`;

export const DELETE_TASK_MUTATION = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

export const ASSIGN_USER_MUTATION = gql`
  mutation AssignUserToTask($taskId: ID!, $userId: ID!) {
    assignUserToTask(taskId: $taskId, userId: $userId) {
      id
      assignees {
        id
        email
        name
        avatarUrl
      }
    }
  }
`;

export const UNASSIGN_USER_MUTATION = gql`
  mutation UnassignUserFromTask($taskId: ID!, $userId: ID!) {
    unassignUserFromTask(taskId: $taskId, userId: $userId) {
      id
      assignees {
        id
        email
        name
        avatarUrl
      }
    }
  }
`;

// Comments
export const ADD_COMMENT_MUTATION = gql`
  mutation AddComment($taskId: ID!, $text: String!) {
    addComment(taskId: $taskId, text: $text) {
      id
      text
      createdAt
      user {
        id
        name
        avatarUrl
      }
    }
  }
`;

export const DELETE_COMMENT_MUTATION = gql`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id)
  }
`;

// Labels
export const CREATE_LABEL_MUTATION = gql`
  mutation CreateLabel($boardId: ID!, $name: String!, $color: String!) {
    createLabel(boardId: $boardId, name: $name, color: $color) {
      id
      name
      color
    }
  }
`;

export const ADD_LABEL_TO_TASK_MUTATION = gql`
  mutation AddLabelToTask($taskId: ID!, $labelId: ID!) {
    addLabelToTask(taskId: $taskId, labelId: $labelId) {
      id
      labels {
        id
        name
        color
      }
    }
  }
`;

export const REMOVE_LABEL_FROM_TASK_MUTATION = gql`
  mutation RemoveLabelFromTask($taskId: ID!, $labelId: ID!) {
    removeLabelFromTask(taskId: $taskId, labelId: $labelId) {
      id
      labels {
        id
        name
        color
      }
    }
  }
`;

// Notifications
export const NOTIFICATIONS_QUERY = gql`
  query Notifications {
    notifications {
      id
      type
      message
      isRead
      link
      createdAt
      actor {
        id
        name
        avatarUrl
      }
    }
  }
`;

export const MARK_NOTIFICATIONS_READ_MUTATION = gql`
  mutation MarkNotificationsAsRead($ids: [ID!]!) {
    markNotificationsAsRead(ids: $ids) {
      id
      isRead
    }
  }
`;
