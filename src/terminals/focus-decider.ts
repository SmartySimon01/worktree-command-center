/** When a session becomes ready: center now, unless the user is mid-typing
 *  in a terminal (then defer until they press Enter). */
export function decideOnReady(state: { userTyping: boolean }): 'center-now' | 'defer' {
	return state.userTyping ? 'defer' : 'center-now';
}
