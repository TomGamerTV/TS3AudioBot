class PlayControls {

	private playing: PlayState = PlayState.Off;
	private repeat: RepeatKind = RepeatKind.Off;
	private random: boolean = false;
	private trackPosition: number = 0;
	private trackLength: number = 0;
	private volume: number = 0;
	private muteToggleVolume: number = 0;

	private playTick: Timer;
	private divRepeat: HTMLElement;
	private divRandom: HTMLElement;
	private divPlay: HTMLElement;
	private divPrev: HTMLElement;
	private divNext: HTMLElement;

	private divVolumeMute: HTMLElement;
	private divVolumeSlider: HTMLInputElement;
	private divPositionSlider: HTMLInputElement;
	private divPosition: HTMLElement;
	private divLength: HTMLElement;

	private constructor() {
		this.divRepeat = Util.getElementByIdSafe("playctrlrepeat");
		this.divRandom = Util.getElementByIdSafe("playctrlrandom");
		this.divPlay = Util.getElementByIdSafe("playctrlplay");
		this.divPrev = Util.getElementByIdSafe("playctrlprev");
		this.divNext = Util.getElementByIdSafe("playctrlnext");

		this.divVolumeMute = Util.getElementByIdSafe("playctrlmute");
		this.divVolumeSlider = Util.getElementByIdSafe("playctrlvolume") as HTMLInputElement;
		this.divPositionSlider = Util.getElementByIdSafe("playctrlposition") as HTMLInputElement;
		this.divPosition = Util.getElementByIdSafe("data_track_position");
		this.divLength = Util.getElementByIdSafe("data_track_length");

		this.divRepeat.onclick = async () => {
			Util.setIcon(this.divRepeat, "cog-work");
			const res = await Get.api(bot(jmerge(
				cmd<void>("repeat", RepeatKind[(this.repeat + 1) % 3].toLowerCase()),
				cmd<RepeatKind>("repeat"),
			)));
			if (res instanceof ErrorObject)
				return this.showStateRepeat(this.repeat);
			this.showStateRepeat(res[1]);
		};

		this.divRandom.onclick = async () => {
			Util.setIcon(this.divRandom, "cog-work");
			const res = await Get.api(bot(jmerge(
				cmd<void>("random", (!this.random) ? "on" : "off"),
				cmd<boolean>("random"),
			)));
			if (res instanceof ErrorObject)
				return this.showStateRandom(this.random);
			this.showStateRandom(res[1]);
		};

		const setVolume = async (volume: number, applySlider: boolean) => {
			const res = await Get.api(bot(jmerge(
				cmd<void>("volume", volume.toString()),
				cmd<number>("volume"),
			)));
			if (res instanceof ErrorObject)
				return this.showStateVolume(this.volume, applySlider);
			this.showStateVolume(res[1], applySlider);
		}
		this.divVolumeMute.onclick = async () => {
			if (this.muteToggleVolume !== 0 && this.volume === 0) {
				await setVolume(this.muteToggleVolume, true);
				this.muteToggleVolume = 0;
			} else {
				this.muteToggleVolume = this.volume;
				await setVolume(0, true);
			}
		}
		this.divVolumeSlider.onchange = async () => {
			this.muteToggleVolume = 0;
			this.divVolumeSlider.classList.add("loading");
			await setVolume(Util.slider_to_volume(Number(this.divVolumeSlider.value)), false);
			this.divVolumeSlider.classList.remove("loading");
		}

		this.divNext.onclick = async () => {
			const res = await Get.api(bot(cmd<void>("next")));
			if (res instanceof ErrorObject)
				return;
		}

		this.divPrev.onclick = async () => {
			const res = await Get.api(bot(cmd<void>("previous")));
			if (res instanceof ErrorObject)
				return;
		}

		this.divPlay.onclick = async () => {
			switch (this.playing) {
				case PlayState.Off:
					return;
				case PlayState.Playing:
					let res0 = await Get.api(bot(jmerge(
						cmd<void>("stop"),
						cmd<string | null>("song"), // TODO update when better method
					)));
					if (res0 instanceof ErrorObject)
						return;
					this.showStatePlaying(res0[1] ? PlayState.Playing : PlayState.Off);
					break;
				case PlayState.Paused:
					let res1 = await Get.api(bot(jmerge(
						cmd<void>("play"),
						cmd<string | null>("song"), // TODO update when better method
					)));
					if (res1 instanceof ErrorObject)
						return;
					this.showStatePlaying(res1[1] ? PlayState.Playing : PlayState.Off);
					break;
				default:
					break;
			}
		}

		this.divPositionSlider.onchange = async () => {
			if (this.playing === PlayState.Off)
				return;

			this.divPositionSlider.classList.add("loading");
			let res = await Get.api(bot(
				cmd<void>("seek", Math.floor(Number(this.divPositionSlider.value)).toString())
			));
			this.divPositionSlider.classList.remove("loading");

			if (res instanceof ErrorObject)
				return;
		}

		this.playTick = new Timer(() => {
			if (this.trackPosition < this.trackLength) {
				this.trackPosition += 1;
				this.showStatePosition(this.trackPosition);
			}
		}, 1000);
	}

	public enable() {
		const divPlayCtrl = Util.getElementByIdSafe("playblock");
		divPlayCtrl.classList.remove("playdisabled");
	}

	public disable() {
		const divPlayCtrl = Util.getElementByIdSafe("playblock");
		divPlayCtrl.classList.add("playdisabled");
	}

	public static get(): PlayControls | undefined {
		const elem = document.getElementById("playblock");
		if (!elem)
			return undefined;

		let playCtrl: PlayControls | undefined = (elem as any).playControls;
		if (!playCtrl) {
			playCtrl = new PlayControls();

			(elem as any).playControls = playCtrl;
		}
		return playCtrl;
	}

	public showStateRepeat(state: RepeatKind) {
		this.repeat = state;
		switch (state) {
			case RepeatKind.Off:
				Util.setIcon(this.divRepeat, "loop-off");
				break;
			case RepeatKind.One:
				Util.setIcon(this.divRepeat, "loop-one");
				break;
			case RepeatKind.All:
				Util.setIcon(this.divRepeat, "loop-all");
				break;
			default:
				break;
		}
	}

	public showStateRandom(state: boolean) {
		this.random = state;
		Util.setIcon(this.divRandom, (state ? "random" : "random-off"));
	}

	public showStateVolume(volume: number, applySlider: boolean = true) {
		this.volume = volume;
		const logaVolume = Util.volume_to_slider(volume);
		if (applySlider)
			this.divVolumeSlider.value = logaVolume.toString();
		if (logaVolume <= 0.001)
			Util.setIcon(this.divVolumeMute, "volume-off");
		else if (logaVolume <= 7.0 / 2)
			Util.setIcon(this.divVolumeMute, "volume-low");
		else
			Util.setIcon(this.divVolumeMute, "volume-high");
	}

	// in seconds
	public showStateLength(length: number) {
		this.trackLength = length;
		const displayTime = Util.formatSecondsToTime(length);
		this.divLength.innerText = displayTime;
		this.divPositionSlider.max = length.toString();
	}

	// in seconds
	public showStatePosition(position: number) {
		this.trackPosition = position;
		const displayTime = Util.formatSecondsToTime(position);
		this.divPosition.innerText = displayTime;
		this.divPositionSlider.value = position.toString();
	}

	public showStatePlaying(playing: PlayState) {
		this.playing = playing;
		switch (playing) {
			case PlayState.Off:
				this.showStateLength(0);
				this.showStatePosition(0);
				this.playTick.stop();
				Util.setIcon(this.divPlay, "heart");
				break;
			case PlayState.Playing:
				this.playTick.start();
				Util.setIcon(this.divPlay, "media-stop");
				break;
			case PlayState.Paused:
				this.playTick.stop();
				Util.setIcon(this.divPlay, "media-play");
				break;
			default:
				break;
		}
	}
}

enum RepeatKind {
	Off = 0,
	One,
	All,
}

enum PlayState {
	Off,
	Playing,
	Paused,
}