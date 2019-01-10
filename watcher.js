class Watcher {                         //监听数据，根据属于或方法，执行回调函数
	constructor(vm,expOrFn,cb) {
		this.vm = vm      				//总的data
		this.expOrFn = expOrFn          //表达式(vm的属性)，或者一个function
		this.cb = cb					//数据更新后执行的回调函数
		this.initGetter(expOrFn)        // 解析表达式，得到一个getter方法
		this.initGet = this.get()       //初始化一次，set 全局DEP的target，target不为null，可在订阅器中添加订阅者(watcher)，之后target置空，避免每次获vm的值的之后递归添加订阅者
		this.value = typeof this.initGet === 'object'?deepCopy(this.initGet):this.initGet   //当前订阅者的值（是否需要深拷贝），新旧值对比来源，
	}
	initGetter(exp) {   //getter方法，获取vm上expOrFn的值
		const t = Object.prototype.toString.call(exp)
		switch(t) {
			case '[object Function]': this.getter = exp;break;
			default: this.getter = this.parseGetter(exp);break;     //判断是否是vm的key的key,  --> child.text
		}
	}
	addDep(dep) {   // 通过订阅器去添加当前订阅器
		dep.addSub(this)
	}
	get() {  
		DEP.setTarget(this)   //改变DEP.target
		let value = undefined
		if(this.getter) {
			value = this.getter.call(this.vm,this.vm)      //去获取vm上的值，走了一遍数据劫持，这是DEP.target不为空，就能添加订阅者了
		}
        DEP.setTarget(null)    //置空DEP.target避免重复添加
        return value
	}
	run() {   //获取新旧值对比是否有更新，更新后通知this.cb执行
		const oldVal = typeof this.value === 'object'? deepCopy(this.value):this.value  //基本类型与引用类型
		let value = this.getter.call(this.vm,this.vm),isSameFlag
		if(typeof value === 'object') {
			isSameFlag = Object.keys(value).every(key => {
				return value[key] === oldVal[key]
			})
		}else{
			isSameFlag = value === oldVal
		}
        if (!isSameFlag) {
            this.value = typeof value === 'object'?deepCopy(value) : value    //通知更新，重赋值当前watcher的value，下次更新时会用到
            this.cb.call(this.vm, value, oldVal)        //回调函数执行，且this指向vm
        }
	}
	update() {      //数据更新 == 》 DEP里调用
		this.run()
	}
	parseGetter(exp) {    //解析text，child.text等不同的情况
        var exps = exp.split('.');
        return function(obj) {
            for (var i = 0, len = exps.length; i < len; i++) {
                if (!obj) return;
                obj = obj[exps[i]];
            }
            return obj;
        }
	}
}
function deepCopy(obj) {   //深拷贝一下
      var result = Array.isArray(obj) ? [] : {};
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object') {
            result[key] = deepCopy(obj[key]);   
          } else {
            result[key] = obj[key];
          }
        }
      }
      return result;
  }