import BaseRoute from 'console/routes/base-route';

export default BaseRoute.extend({
	beforeModel: function(){
		if( !bridgeit.io.auth.isLoggedIn()){
			this.info('unauthorized, transitioning to index');
			this.transitionTo('index');
		}
		else{
			window.addEventListener('bridgeit-session-expired', (e) => {
				console.log('console app received event bridgeit-session-expired', e);
				this.transitionTo('index');
			});
		}
	}
});
