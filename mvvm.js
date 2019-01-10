class Vue {
	constructor(options) {   //绑到this上便于调用
		this._data = options.data() || {}
		this._watch = options.watch || {}
		this._computed = options.computed || {}
		this._methods = options.methods || {}
		this._created = options.created || function() {}
		this._mounted = options.mounted || function() {}
		this._update = options.update || function() {}
		this.$el = options.el
		this.init()  
	}
	init() {
		console.time('UseTime')
		Object.keys(this._data).forEach(key => {         //将_data上的key代理到this身上，即 this._data[key] === this[key]
			this.proxyData(key)							//在实例里能this[key]调用
		})
		new Observer(this._data)           //劫持数据，添加watcher
		this.initComputed()             // 计算属性
		this.proxyMethods()           // 代理方法到this上
		this.$watch(this._watch)      //实例里的watch
		this._created()             
		new Compiler(this.$el,this)       //编译dom
		this._mounted()
		console.timeEnd('UseTime')
	}
	expKeys(key) {           //判断this上的key是否有重复了
		const f = Object.keys(this).includes(key)
		if(f) {
			 throw Error(`The property or method ${key} already define,please try rename the ${key}`)
		}
	}
	proxyData(key) {    //代理data
		this.expKeys(key)
		Object.defineProperty(this,key,{
			enumerable: true,
			configurable: true,
			get: () => this._data[key],
			set: (newVal) => {
				this._data[key] = newVal
				this._update()  // 通知更新,此时只是数据更新
			}
		})
	}
	proxyMethods() {   //代理方法
		Object.keys(this._methods).forEach(key => {
			this.expKeys(key)
			Object.defineProperty(this,key,{
				get : () => this._methods[key]
			})
		})
	}
	initComputed() {   //计算属性
		Object.keys(this._computed).forEach(key => {
			this.expKeys(key)
			const getter = typeof this._computed[key] === 'function' ? this._computed[key] : this._computed[key].get
			Object.defineProperty(this,key,{
				get: getter
			})
		})
	}
	$watch(obj={}) {   //实例里的watch
		var keys = Object.keys(obj)
		if (keys.length === 0) return
		keys.forEach(key => {
			if(typeof obj[key] !== 'function') console.error(`${key} of watch should be function`)
			if(typeof obj[key] === 'function') {
				new Watcher(this,key,obj[key])
			}
		})
	}

}