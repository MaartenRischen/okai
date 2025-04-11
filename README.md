# OkAi Application

OkAi is a personal assistant and note-taking application designed to help with ADHD management. It serves as an "external brain" that captures and organizes thoughts, ideas, and information.

## Features (MVP)

- Simple note-taking functionality
- Secure authentication
- Persistent storage of notes
- Responsive, clean interface

## Coming Soon

- File uploads and management
- AI-powered analysis and organization
- Task extraction and deadline tracking
- Semantic search
- Automatic categorization

## Running Locally

1. **Install dependencies**
   ```
   npm install
   ```

2. **Set up database**
   You need to have PostgreSQL installed locally. Create a database named `okai_db`.

3. **Configure environment variables**
   Create a `.env` file in the root directory with the following variables:
   ```
   ADMIN_USER=yourusername
   ADMIN_PASSWORD=yourpassword
   DATABASE_URL=postgres://username:password@localhost:5432/okai_db
   NODE_ENV=development
   ```

4. **Start the server**
   ```
   npm start
   ```
   
   For development with automatic reloading:
   ```
   npm run dev
   ```

5. **Access the application**
   Open a browser and navigate to http://localhost:3000. You will be prompted for the username and password specified in your `.env` file.

## Deployment

This application is deployed on Railway and available at [okai.studio](https://okai.studio). 
