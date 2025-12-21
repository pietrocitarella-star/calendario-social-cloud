
export interface SocialChannel {
  id: string;
  name: string;
  color: string;
}

export interface TeamMember {
  id: string;
  name: string;
  color: string; // Colore identificativo dell'utente
}

export enum PostStatus {
  NotStarted = 'non iniziato',
  Draft = 'in bozze',
  NeedsApproval = 'da approvare',
  Waiting = 'in attesa',
  Scheduled = 'programmato',
  Published = 'pubblicato',
  Cancelled = 'cancellato',
  Collaboration = 'collaborazione', // Aggiunto qui
}

export enum PostType {
  Post = 'post',
  Carousel = 'carosello',
  Video = 'video',
  Reel = 'reel',
  Story = 'storia',
  Update = 'aggiornamento',
  Repost = 'repost',
}

export interface PostVersion {
  timestamp: string;
  data: Omit<Post, 'history'>;
}

export interface Post {
  id?: string;
  title: string;
  date: string; // ISO format string e.g., 'YYYY-MM-DDTHH:mm'
  social: string; // Now a string, refers to SocialChannel.name
  status: PostStatus;
  postType: PostType;
  assignedTo?: string; // ID del TeamMember
  externalLink?: string;
  creativityLink?: string;
  notes?: string;
  history?: PostVersion[]; // Array of previous versions
}

export interface CalendarEvent extends Post {
  start: Date;
  end: Date;
}

export interface AppNotification {
    id: string;
    type: 'deadline' | 'approval';
    message: string;
    postId: string;
    date: string;
}
