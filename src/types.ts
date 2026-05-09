export interface Project {
  id?: string;
  title: string;
  description: string;
  technologies: string[];
  roles: string[];
  skills: string[];
  ownerId: string;
  members: string[]; // user IDs
  maxMembers?: number;
  status: 'open' | 'closed' | 'completed';
  createdAt: any;
  updatedAt?: any;
}

export interface ProjectRequest {
  id?: string;
  projectId: string;
  userId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
  updatedAt?: any;
}

export interface Chat {
  id?: string;
  type: 'direct' | 'project';
  participants: string[];
  projectId?: string;
  contextType?: string;
  contextId?: string;
  contextTitle?: string;
  lastMessage?: string;
  lastMessageAt?: any;
  lastMessageSenderId?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface Message {
  id?: string;
  chatId: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  createdAt: any;
  readBy: string[];
}

export interface Resource {
  id?: string;
  title: string;
  description: string;
  category: 'MCA' | 'CSE' | 'Biotech' | 'Electrical' | 'Mechanical' | 'Civil';
  subcategory: 'Exam Notes' | 'Subject Notes' | 'Previous Year Questions' | 'Assignments' | 'Lab Manuals' | 'Other';
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  uploadedBy: string;
  uploaderRole: 'student' | 'alumni' | 'mentor';
  downloads: number;
  createdAt: any;
}

export interface Opportunity {
  id?: string;
  title: string;
  company: string;
  type: 'internship' | 'job' | 'referral' | 'freelance';
  stipend?: string;
  location: string;
  skills: string[];
  description: string;
  eligibility: string;
  applicationLink?: string;
  postedBy: string;
  createdAt: any;
  status: 'open' | 'closed';
}

export interface Event {
  id?: string;
  title: string;
  description: string;
  type: 'hackathon' | 'workshop' | 'webinar' | 'seminar' | 'coding contest';
  date: any; // Date/Time
  location: string; // Online or venue
  registrationLink?: string;
  postedBy: string;
  createdAt: any;
  registeredUsers: string[]; // array of UIDs
  verificationStatus: 'pending' | 'verified' | 'rejected';
  teamSize?: number;
  requiredSkills?: string[];
}

export interface Notification {
  id?: string;
  receiverId: string;
  senderId: string;
  relatedId: string; // resourceId, opportunityId, etc.
  relatedType: 'resource' | 'opportunity' | 'event' | 'connection' | 'chat';
  routePath: string; // e.g. /resources, /opportunities/:id
  message: string;
  isRead: boolean;
  createdAt: any;
}

