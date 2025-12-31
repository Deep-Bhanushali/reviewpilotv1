import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Get base URL from environment or use localhost for development
const getBaseUrl = () => {
  return process.env.BASE_URL || 'http://localhost:5000';
};

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;

  constructor() {
    // Initialize with a default redirect URI, will be updated in getAuthUrl
    this.oauth2Client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      `${getBaseUrl()}/api/auth/google/callback`
    );
  }

  getAuthUrl(userId: string): string {
    // Update OAuth2Client with correct redirect URI
    const redirectUri = `${getBaseUrl()}/api/auth/google/callback`;
    this.oauth2Client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass userId to link the callback to the user
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  async exchangeCodeForTokens(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  async createCalendarEvent(
    accessToken: string,
    refreshToken: string,
    eventData: {
      title: string;
      description: string;
      startDateTime: Date;
      endDateTime: Date;
      calendarId?: string;
    }
  ) {
    try {
      // Set credentials
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startDateTime.toISOString(),
          timeZone: 'Asia/Kolkata', // Indian timezone
        },
        end: {
          dateTime: eventData.endDateTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 }, // 1 hour before
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: eventData.calendarId || 'primary',
        requestBody: event,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  async updateCalendarEvent(
    accessToken: string,
    refreshToken: string,
    eventId: string,
    eventData: {
      title: string;
      description: string;
      startDateTime: Date;
      endDateTime: Date;
      calendarId?: string;
    }
  ) {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startDateTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: eventData.endDateTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
          ],
        },
      };

      const response = await calendar.events.update({
        calendarId: eventData.calendarId || 'primary',
        eventId,
        requestBody: event,
      });

      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  async deleteCalendarEvent(
    accessToken: string,
    refreshToken: string,
    eventId: string,
    calendarId?: string
  ) {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      await calendar.events.delete({
        calendarId: calendarId || 'primary',
        eventId,
      });

      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      // Don't throw - if event doesn't exist, that's okay
      return false;
    }
  }

  async testConnection(
    accessToken: string,
    refreshToken: string
  ) {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Try to list calendars to verify connection
      await calendar.calendarList.list({
        maxResults: 1
      });

      return true;
    } catch (error) {
      console.error('Error testing calendar connection:', error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();