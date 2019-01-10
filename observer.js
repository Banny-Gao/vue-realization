const arrayProto = Array.prototype;      
const arrayMethods = Object.create(arrayProto);    //获取Array原型并创建新对象，避免污染Array的prototype
[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
].forEach(item=>{                            //对数组中改变自身的方法劫持
	Object.defineProperty(arrayMethods,item,{
	    value:function (){
		    arrayProto[item].call(this,...arguments) //执行方法
		    DEP.notify()		//通知更新
	    },
	})
})

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)   //获取数组劫持的方法
class Observer {
	constructor(data) {
	    if( Array.isArray(data) ){   //传进来是数组使用数组劫持
	    	const augment = data.__proto__ ? this.protoAugment : this.copyAugment  
	    	// 获取替换原型的方法
	        //此处的 arrayMethods 就是上面使用Object.defineProperty处理过
	        augment(data, arrayMethods, arrayKeys)  //将传进来的数组替换原型，以后当前data使用push什么的，就是arrayMethods的劫持了
	        this.dependArray(data)   //数组的订阅器添加
	    }else{
	    	this.init(data)    //普通对象的订阅器添加
	    }
	}
	init(data) {
		Object.keys(data).forEach(key => {     //对象的所有key的劫持
			this.defineReactive(data,key,data[key])
		})
	}
	defineReactive(data,key,val) {
		let childObj = this.observe(val),self = this	//	对劫持的key操作，传入observe中value，是一个对象将递归劫持value
		Object.defineProperty(data,key,{
			enumerabel: true,   //可枚举
			configurabel: true,	//可修改
			get() {
				// console.log('in get key =>' + key)
				DEP.depend()    //添加到订阅器
				return val
			},
			set(newVal) {
				if(newVal === val) return
				val = newVal   
				// console.log('in set key =>' + key)
				childObj = self.observe(val)      //去判断是否对set的新值进行数据劫持
				DEP.notify()  //通知更新
			}
		})
	}
	observe(value) {
		if(!value || typeof value !== 'object') return    
		return new Observer(value)       //只对object进行劫持
	}
	protoAugment (target,src) {
	  target.__proto__ = src       //支持隐式原型直接赋值
	}
	copyAugment (target, src, keys) { //不支持的set key
	  for (let i = 0, l = keys.length; i < l; i++) {
	    const key = keys[i]
	    this.def(target, key, src[key])  //将key值设置到target来源对象上去
	  }
	}
	def (obj, key, val) {   //设置对象属性值辅助方法
	  Object.defineProperty(obj, key, {
	    value: val,
	    enumerable: true,
	    writable: true,
	    configurable: true
	  })
	}
	dependArray (value) {     //劫持数组对象
	  for (let e, i = 0, l = value.length; i < l; i++) {
	    e = value[i]
	    this.observe(e)  
	    DEP.depend()
	  }
	}
}
class Dep {    //订阅器  ==>  收集订阅者
	constructor() {
		this.target = null
		this.subs = []   //收集watcher数组
	}
	setTarget(vm) {
		this.target = vm
	}
	addSub(sub) {   //添加watcher的方法 -----  DEP的方法
		this.subs.push(sub)
	}
	removeSub(sub) {    //移除wtcher，暂时没什么用
		const i = this.subs.indexOf(sub)
		if(i!==-1) this.subs.splice(i,1)
	}
	depend() {  //传入订阅器，然后添加订阅者
		if(this.target) this.target.addDep(this)
    }
	notify() {     //通知订阅者更新
		// console.log(this.subs)  //所有watcher
		this.subs.forEach(sub => {
			sub.update()
		})
	}
}

//创建一个全局订阅器实例
const  DEP = new Dep()