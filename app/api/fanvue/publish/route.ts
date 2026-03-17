import { NextRequest } from 'next/server';
import {
  parseRequestBody,
  validateRequiredFields,
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validateArray,
  getErrorMessage,
  safeFetch,
  withErrorHandler,
} from '@/lib/api-utils';

const FANVUE_API_BASE = 'https://api.fanvue.com';

interface FanvuePublishRequest {
  accessToken: string;
  title?: string;
  description?: string;
  mediaUrls?: string[];
}

interface FanvuePublishResponse {
  success: boolean;
  post: {
    id: string;
    title: string;
    body: string;
    [key: string]: unknown;
  };
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<FanvuePublishRequest>(request);

  // Validate required fields
  const validation = validateRequiredFields(body, ['accessToken']);

  if (!validation.valid) {
    return errorResponse(
      `Missing required fields: ${validation.missing.join(', ')}`,
      400
    );
  }

  const { accessToken, title, description, mediaUrls = [] } = body;

  // Validate mediaUrls if provided
  if (mediaUrls.length > 0) {
    try {
      validateArray(mediaUrls, 1, 10);
    } catch (error) {
      return errorResponse('mediaUrls must be an array of 1-10 URLs', 400);
    }
  }

  try {
    // Create the post
    const postRes = await safeFetch(
      `${FANVUE_API_BASE}/posts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Fanvue-API-Version': '2025-06-26',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || '',
          body: description || '',
          // Media would be attached via upload separately
          // For now, include mediaUrls in the post body for reference
          ...(mediaUrls?.length > 0 ? { mediaUrls } : {}),
        }),
      },
      'Fanvue API request failed'
    );

    const data = await postRes.json();

    return successResponse<FanvuePublishResponse>({
      success: true,
      post: data,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    // Check if it's an auth error
    if (message.includes('401') || message.includes('Unauthorized')) {
      return unauthorizedResponse('Invalid Fanvue access token');
    }

    return errorResponse(message, 500);
  }
});
