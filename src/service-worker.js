self.addEventListener('push', (event) => {
	const data = event.data.json();

	const options = {
		body: data.body || 'You have new tasks!',
		badge: '/path-to-badge-icon.png', // Optional: Icon for the badge.
		icon: '/logo512.png', // App icon.
		tag: 'task-update' // Prevent duplicate notifications.
	};

	event.waitUntil(self.registration.showNotification(data.title || 'New Notification', options));
});
