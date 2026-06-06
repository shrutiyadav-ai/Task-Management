const typeDefs = `#graphql
  # Enums
  enum BoardRole {
    OWNER
    ADMIN
    MEMBER
  }

  enum TaskPriority {
    LOW
    MEDIUM
    HIGH
    URGENT
  }

  # Object Types
  type User {
    id: ID!
    email: String!
    name: String!
    avatarUrl: String
    createdAt: String!
    updatedAt: String!
  }

  type Board {
    id: ID!
    title: String!
    description: String
    isPublic: Boolean!
    members: [BoardMember!]!
    columns: [Column!]!
    labels: [Label!]!
    createdAt: String!
    updatedAt: String!
  }

  type BoardMember {
    id: ID!
    boardId: ID!
    userId: ID!
    role: BoardRole!
    user: User!
    createdAt: String!
    updatedAt: String!
  }

  type Column {
    id: ID!
    boardId: ID!
    title: String!
    position: Float!
    tasks: [Task!]!
    createdAt: String!
    updatedAt: String!
  }

  type Task {
    id: ID!
    columnId: ID!
    title: String!
    description: String
    position: Float!
    priority: TaskPriority!
    dueDate: String
    assignees: [User!]!
    comments: [Comment!]!
    labels: [Label!]!
    createdAt: String!
    updatedAt: String!
  }

  type Comment {
    id: ID!
    taskId: ID!
    user: User!
    text: String!
    createdAt: String!
    updatedAt: String!
  }

  type Label {
    id: ID!
    boardId: ID!
    name: String!
    color: String!
    createdAt: String!
  }

  type Notification {
    id: ID!
    userId: ID!
    actor: User
    type: String!
    message: String!
    isRead: Boolean!
    link: String
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  # Queries
  type Query {
    me: User
    boards: [Board!]!
    board(id: ID!): Board
    notifications: [Notification!]!
  }

  # Mutations
  type Mutation {
    # Authentication
    register(email: String!, password: String!, name: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    updateProfile(name: String, avatarUrl: String): User!

    # Boards
    createBoard(title: String!, description: String): Board!
    updateBoard(id: ID!, title: String, description: String, isPublic: Boolean): Board!
    deleteBoard(id: ID!): ID!
    
    # Board Membership
    addBoardMember(boardId: ID!, email: String!, role: BoardRole!): BoardMember!
    updateBoardMemberRole(boardId: ID!, userId: ID!, role: BoardRole!): BoardMember!
    removeBoardMember(boardId: ID!, userId: ID!): ID!

    # Columns
    createColumn(boardId: ID!, title: String!, position: Float!): Column!
    updateColumn(id: ID!, title: String, position: Float): Column!
    deleteColumn(id: ID!): ID!

    # Tasks
    createTask(columnId: ID!, title: String!, description: String, priority: TaskPriority, dueDate: String): Task!
    updateTask(
      id: ID!
      columnId: ID
      title: String
      description: String
      position: Float
      priority: TaskPriority
      dueDate: String
    ): Task!
    deleteTask(id: ID!): ID!

    # Task Assignment & Labels
    assignUserToTask(taskId: ID!, userId: ID!): Task!
    unassignUserFromTask(taskId: ID!, userId: ID!): Task!
    addLabelToTask(taskId: ID!, labelId: ID!): Task!
    removeLabelFromTask(taskId: ID!, labelId: ID!): Task!

    # Labels
    createLabel(boardId: ID!, name: String!, color: String!): Label!
    deleteLabel(id: ID!): ID!

    # Comments
    addComment(taskId: ID!, text: String!): Comment!
    deleteComment(id: ID!): ID!

    # Notifications
    markNotificationsAsRead(ids: [ID!]!): [Notification!]!
  }
`;

export default typeDefs;
