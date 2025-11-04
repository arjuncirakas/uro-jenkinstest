# Rate Limiting Configuration Guide

## Overview
Rate limiting is now configurable and can be easily enabled/disabled via environment variables. This allows for flexible development and production deployment.

## Current Status
**Rate limiting is currently DISABLED** for development purposes.

## Configuration

### Environment Variables
Edit `backend/secure.env` to control rate limiting:

```env
# Rate Limiting Configuration
# Set to 'true' to enable rate limiting, 'false' to disable
ENABLE_RATE_LIMITING=false

# Rate Limiting Settings (only used when ENABLE_RATE_LIMITING=true)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
OTP_RATE_LIMIT_MAX=3
REGISTRATION_RATE_LIMIT_MAX=3
```

### Quick Toggle Commands

#### Enable Rate Limiting
```bash
cd backend
npm run rate-limit:enable
```

#### Disable Rate Limiting
```bash
cd backend
npm run rate-limit:disable
```

#### Check Current Status
```bash
cd backend
npm run rate-limit:status
```

### Manual Configuration
You can also manually edit `backend/secure.env`:

```env
# To enable rate limiting
ENABLE_RATE_LIMITING=true

# To disable rate limiting
ENABLE_RATE_LIMITING=false
```

## Rate Limiting Settings

When enabled, the following limits apply:

### 1. General Rate Limiting
- **Window**: 15 minutes (900,000 ms)
- **Max Requests**: 100 per IP
- **Applies to**: All API endpoints

### 2. Authentication Rate Limiting
- **Window**: 15 minutes
- **Max Requests**: 5 per IP
- **Applies to**: Login endpoints

### 3. OTP Rate Limiting
- **Window**: 5 minutes
- **Max Requests**: 3 per IP
- **Applies to**: OTP generation and verification

### 4. Registration Rate Limiting
- **Window**: 1 hour
- **Max Requests**: 3 per IP
- **Applies to**: User registration

## Development vs Production

### Development (Current)
```env
ENABLE_RATE_LIMITING=false
```
- No rate limiting restrictions
- Faster development and testing
- No API call limits

### Production (Recommended)
```env
ENABLE_RATE_LIMITING=true
```
- Full rate limiting protection
- Prevents abuse and DDoS attacks
- Configurable limits per endpoint type

## Server Startup Logs

When the server starts, you'll see the current rate limiting status:

```
🛡️  Rate Limiting: DISABLED
```

or

```
🛡️  Rate Limiting: ENABLED
```

## Testing Rate Limiting

### 1. Enable Rate Limiting
```bash
cd backend
npm run rate-limit:enable
npm run dev
```

### 2. Test Limits
```bash
# Test general rate limiting (100 requests per 15 minutes)
for i in {1..105}; do curl http://localhost:5000/api; done

# Test auth rate limiting (5 requests per 15 minutes)
for i in {1..6}; do curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}'; done
```

### 3. Check Rate Limit Headers
When rate limiting is enabled, responses include rate limit headers:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Time when the rate limit resets

## Customizing Limits

To customize rate limiting limits, edit the environment variables in `secure.env`:

```env
# General rate limiting
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100    # Max requests per window

# Authentication rate limiting
AUTH_RATE_LIMIT_MAX=5          # Max auth attempts per 15 minutes

# OTP rate limiting
OTP_RATE_LIMIT_MAX=3           # Max OTP requests per 5 minutes

# Registration rate limiting
REGISTRATION_RATE_LIMIT_MAX=3  # Max registration attempts per hour
```

## Error Responses

When rate limits are exceeded, the API returns:

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later.",
  "retryAfter": 900
}
```

## Monitoring

### Rate Limit Headers
All responses include rate limiting information:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Reset timestamp

### Server Logs
Rate limiting status is logged on server startup:
```
🛡️  Rate Limiting: ENABLED
```

## Best Practices

### Development
1. Keep rate limiting disabled during development
2. Test with rate limiting enabled before production
3. Use the toggle scripts for easy switching

### Production
1. Always enable rate limiting in production
2. Monitor rate limit headers
3. Adjust limits based on usage patterns
4. Set up alerts for rate limit violations

### Testing
1. Test all endpoints with rate limiting enabled
2. Verify error responses are user-friendly
3. Check that limits reset properly
4. Test edge cases and boundary conditions

## Troubleshooting

### Rate Limiting Not Working
1. Check `ENABLE_RATE_LIMITING` is set to `true`
2. Restart the server after changing environment variables
3. Verify the middleware is properly imported

### Too Restrictive
1. Increase the limits in environment variables
2. Adjust the time windows if needed
3. Consider different limits for different user types

### Not Restrictive Enough
1. Decrease the limits in environment variables
2. Add additional rate limiting layers
3. Implement IP-based blocking for repeat offenders

## Security Considerations

### When Disabled
- No protection against abuse
- Vulnerable to DDoS attacks
- Should only be used in development

### When Enabled
- Protects against brute force attacks
- Prevents API abuse
- May block legitimate users if limits are too low

## Migration to Production

1. **Development Phase**: Keep `ENABLE_RATE_LIMITING=false`
2. **Testing Phase**: Enable rate limiting and test thoroughly
3. **Production Phase**: Enable rate limiting with appropriate limits
4. **Monitoring**: Monitor usage patterns and adjust limits as needed

## Support

For questions about rate limiting configuration:
- Check server logs for rate limiting status
- Use `npm run rate-limit:status` to check current settings
- Review this documentation for configuration options

