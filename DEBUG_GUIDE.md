# SIGEF - Debugging Guide

## 1. Enabling Debug Mode

The application includes a built-in Debug Panel that intercepts PocketBase requests and shows authentication state.

- **Shortcut**: Press `Ctrl + Shift + D` anywhere in the application to toggle the Debug Panel.
- **Features**: View current user role, PocketBase connection status, clear cache, and view the last 50 network requests with their execution time and status.

## 2. Common Errors & Solutions

### "Failed to fetch" or Network Errors

- **Cause**: PocketBase server is down or unreachable.
- **Solution**: Check if the PocketBase instance is running. The `usePocketBaseData` hook will automatically retry 3 times before showing an error to the user.

### "403 Forbidden"

- **Cause**: The current user does not have permission to access the requested collection or record.
- **Solution**:
  1. Open the Debug Panel (`Ctrl+Shift+D`) and verify the user's role.
  2. Check the collection's `listRule` and `viewRule` in PocketBase.
  3. Ensure you are passing `$autoCancel: false` in your requests.

### "pb is not defined"

- **Cause**: Missing import in the component.
- **Solution**: Ensure `import pb from '@/lib/pocketbaseClient.js';` is at the top of the file.

## 3. Data Fetching Best Practices

Always use the custom `usePocketBaseData` hook instead of direct `pb.collection()` calls in components.
