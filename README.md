# AI Voice Studio

AI Voice Studio is a full-stack AI voice application built with Next.js. It allows authenticated users to generate speech from text, clone voices from audio samples, design AI voices using natural-language descriptions, explore a public voice library, and manage generated audio and saved voices.

## Features

* User registration and login
* Supabase authentication
* Text-to-Speech generation
* AI Voice Cloning
* AI Voice Design
* Public Voice Library
* Save personal, designed, and library voices
* Generated audio history
* Audio playback
* Search and filtering
* Pagination
* Delete generated audio
* Delete saved voices
* Private audio storage
* Temporary signed URLs for audio access
* Row Level Security for user data isolation
* Server-side API key protection

## Tech Stack

### Frontend

* Next.js 15
* React 19
* TypeScript
* Tailwind CSS

### Backend

* Next.js App Router
* Next.js Route Handlers
* Server Components
* Client Components

### Database & Authentication

* Supabase
* PostgreSQL
* Supabase Auth
* Row Level Security (RLS)
* Supabase Storage

### AI

* Fish Audio API

  * Text-to-Speech
  * Voice Cloning
  * Voice Design
  * Public Voice Library

## Architecture

```text
                    USER
                      |
                      v
              Next.js Frontend
             React Components
                      |
                      | fetch()
                      v
             Next.js API Routes
                /app/api/*
                      |
          +-----------+-----------+
          |                       |
          v                       v
      Supabase                Fish Audio
      |                       |
      +-- Authentication      +-- Text-to-Speech
      +-- PostgreSQL          +-- Voice Clone
      +-- Storage             +-- Voice Design
                              +-- Voice Library
```

The application follows a full-stack Next.js architecture. Client components handle user interaction, while server-side API routes handle authentication, validation, database operations, storage, and communication with Fish Audio.

## Project Structure

```text
ai-voice-studio/
│
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── logout/
│   │   │
│   │   ├── history/
│   │   │   ├── [id]/
│   │   │   └── route.ts
│   │   │
│   │   ├── voices/
│   │   │   ├── [id]/
│   │   │   ├── clone/
│   │   │   ├── design/
│   │   │   ├── library/
│   │   │   └── search/
│   │   │
│   │   └── tts/
│   │       └── route.ts
│   │
│   ├── dashboard/
│   │   ├── clone/
│   │   ├── design/
│   │   ├── history/
│   │   ├── library/
│   │   ├── tts/
│   │   ├── voices/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── login/
│   ├── register/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── auth-form.tsx
│   ├── dashboard-sidebar.tsx
│   ├── history-list.tsx
│   ├── logout-button.tsx
│   ├── studio-forms.tsx
│   ├── voice-card-actions.tsx
│   ├── voice-library.tsx
│   ├── icons.tsx
│   └── ui.tsx
│
├── lib/
│   ├── auth.ts
│   ├── fish-audio.ts
│   ├── storage.ts
│   ├── validation.ts
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── types.ts
│
├── supabase/
│   └── schema.sql
│
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── package.json
└── .env.example
```

## Authentication Flow

Authentication is handled using Supabase Auth.

```text
User
 |
 v
Login/Register Form
 |
 v
Next.js API Route
 |
 v
Supabase Auth
 |
 v
Session
 |
 v
Session Cookie
 |
 v
Authenticated Request
```

For authenticated requests:

```text
Request
   |
   v
Supabase Session Cookie
   |
   v
supabase.auth.getUser()
   |
   v
Authenticated User
   |
   v
User ID
   |
   v
profiles table
   |
   v
SessionUser
```

Dashboard routes are protected through Next.js middleware, while sensitive API routes independently verify the authenticated user.

## Text-to-Speech Flow

```text
User enters text
       |
       v
TtsForm
       |
       | POST /api/tts
       v
TTS API Route
       |
       v
Authenticate User
       |
       v
Validate Input
       |
       v
Find User's Voice
       |
       v
Get Fish Audio Reference ID
       |
       v
Create Generation
status = processing
       |
       v
Fish Audio API
       |
       v
Generated Audio
       |
       v
Supabase Storage
       |
       v
Generate Signed URL
       |
       v
Update Generation
status = completed
       |
       v
Return Audio URL
       |
       v
Frontend Audio Player
```

## Voice Cloning Flow

Users can upload an audio sample to create a personal cloned voice.

```text
Audio Sample
     |
     v
CloneForm
     |
     v
POST /api/voices/clone
     |
     v
Validate Audio
     |
     v
Fish Audio Voice Clone API
     |
     v
Fish Voice Model
     |
     v
fish_reference_id
     |
     v
Supabase voices table
     |
     v
type = personal
```

## Voice Design Flow

Voice Design creates voice candidates based on a text description.

```text
Voice Description
       |
       v
DesignForm
       |
       v
POST /api/voices/design
       |
       v
Fish Audio
       |
       v
Voice Candidates
       |
       v
Audio Previews
       |
       v
User Selects Candidate
       |
       v
POST /api/voices/design/save
       |
       v
Persistent Fish Voice Model
       |
       v
Supabase voices table
       |
       v
type = designed
```

## Voice Library Flow

The application can search Fish Audio's public voice library.

```text
Search Query
     |
     v
Voice Library UI
     |
     v
GET /api/voices/search
     |
     v
Fish Audio Public Library
     |
     v
Filter Available Voices
     |
     v
Display Voice Results
     |
     v
User Saves Voice
     |
     v
POST /api/voices/library/save
     |
     v
Verify Voice With Fish Audio
     |
     v
Supabase voices table
     |
     v
type = library
```

## Database Structure

The application uses PostgreSQL through Supabase.

### Profiles

Stores application-level user profile information.

```text
profiles
├── id
├── name
├── email
├── created_at
└── updated_at
```

### Voices

Stores saved user voices.

```text
voices
├── id
├── user_id
├── name
├── type
├── fish_reference_id
├── audio_url
├── created_at
└── updated_at
```

Voice types:

* `personal`
* `designed`
* `library`

### Generations

Stores Text-to-Speech generation history.

```text
generations
├── id
├── user_id
├── type
├── input
├── voice_id
├── voice_name
├── model
├── status
├── audio_url
├── created_at
└── updated_at
```

Generation statuses:

* `pending`
* `processing`
* `completed`
* `failed`

## Audio Storage

Generated audio is stored in a private Supabase Storage bucket.

```text
generated-audio/
└── userId/
    └── generationId.mp3
```

The database stores the storage path rather than exposing a permanent public URL.

When the audio needs to be played, the server generates a temporary signed URL.

The signed URL has a **1-hour TTL (Time To Live)**.

```text
Private Storage
      |
      v
Signed URL
      |
      v
Valid for 1 hour
```

The audio file itself remains stored; only the signed URL expires.

## Security

The application uses multiple security layers.

### Authentication

Supabase Auth handles user authentication and sessions.

### Middleware

Dashboard routes are protected through Next.js middleware.

```text
/dashboard/*
```

Unauthenticated users are redirected to the login page.

### API Authentication

Sensitive API routes independently verify the authenticated Supabase user.

### Row Level Security

Supabase PostgreSQL uses Row Level Security to prevent users from accessing other users' data.

Conceptually:

```text
auth.uid() = user_id
```

### Input Validation

Input validation is centralized in:

```text
lib/validation.ts
```

This validates authentication data, voice names, audio files, search parameters, and other API inputs.

### Private Storage

Generated audio is stored in a private bucket rather than a public bucket.

### Signed URLs

Temporary signed URLs are generated when users need access to their audio.

### API Keys

The Fish Audio API key is stored as a server-side environment variable and is not exposed to the browser.

## Environment Variables

Create a `.env.local` file and configure the required environment variables.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

FISH_API_KEY=your_fish_audio_api_key
FISH_TTS_MODEL=your_fish_tts_model
```

Never commit `.env.local` or other files containing secret API keys.

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd ai-voice-studio
```

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env.local
```

Add your Supabase and Fish Audio credentials to `.env.local`.

Set up the Supabase database using:

```text
supabase/schema.sql
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev
```

Starts the Next.js development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Starts the production server.

```bash
npm run lint
```

Runs ESLint.

```bash
npm run typecheck
```

Runs the TypeScript compiler for type checking.

## API Endpoints

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

### Text-to-Speech

```text
POST /api/tts
```

### Voice Management

```text
GET    /api/voices/search
POST   /api/voices/clone
POST   /api/voices/design
POST   /api/voices/design/save
POST   /api/voices/library/save
DELETE /api/voices/[id]
```

### History

```text
GET    /api/history
DELETE /api/history/[id]
```

## Client vs Server Components

The project uses both Next.js Server Components and Client Components.

### Server Components

Used where server-side data fetching is required.

Examples:

```text
app/dashboard/page.tsx
app/dashboard/tts/page.tsx
app/dashboard/voices/page.tsx
```

### Client Components

Used for interactive functionality such as forms, state, effects, audio playback, and user interactions.

Examples:

```text
components/auth-form.tsx
components/studio-forms.tsx
components/voice-library.tsx
components/history-list.tsx
```

Client Components use:

```tsx
"use client";
```

when required.

## Core Architecture Principle

The frontend does not directly communicate with Fish Audio using the secret API key.

Instead:

```text
React Client
     |
     v
Next.js API Route
     |
     +----> Supabase
     |
     +----> Fish Audio
     |
     v
Response
     |
     v
React UI
```

This keeps API credentials server-side and centralizes authentication, validation, and business logic.

## Future Improvements

Potential improvements include:

* Background job processing for long-running generations
* Generation retry mechanism
* Rate limiting
* Better provider error monitoring
* Usage and credit tracking
* Audio waveform visualization based on actual audio data
* More granular permissions for saved library voices
* Automated testing
* Production logging and monitoring

## License

This project is intended for development and educational/internship purposes.
