class Compiler {
	constructor(el, vm) {
		this.$vm = vm;   //拿数据
		this.$el = document.querySelector(el);   //拿到所要挂载的dom
		this.init()
	}
	init() {
		if (!this.$el) return
		this.$fragment = this.createFragment(this.$el)    //创建碎片==》要去编译了
		this.compileElement(this.$fragment)     //去编译---解析碎片
		this.$el.appendChild(this.$fragment)   //去挂载
	}
	createFragment(el) {
		let fragment = document.createDocumentFragment(),
			childNode
		while (childNode = el.firstChild) {         //循环拿到所有节点
			fragment.appendChild(childNode)
		}
		return fragment
	}
	compileElement(el) {
		// [].slice.call(el.childNodes)         //nodeList类数组转数组
		Array.from(el.childNodes, node => {
			const text = node.textContent,
				reg = /\{\{.*\}\}/
			if (this.isElementNode(node)) {     //编译节点
				this.compileNode(node)
			} else if (this.isTextNode(node) && reg.test(text)) {
				this.compileText(node)       //编译内容 ， {{}}  里的
			}
			if (node.childNodes && node.childNodes.length) {
				this.compileElement(node)      //递归编译所有节点
			}
		})
	}
	compileNode(node) {
		// console.dir(node)
		Array.from(node.attributes, attr => {
			// console.dir(attr)
			if (this.isDirective(attr.name)) {     //指令的编译
				const exp = attr.value,			  //获取节点的属性
					directive = this.getDirective(attr.name),     //根据属性，获取指令
					dirFont = directive[0],        //前缀
					dirValue = directive[1]         //值
				if (this.isEventDirective(dirFont, dirValue)) {     //是否是事件指令
					// console.log(dirFont,dirValue,exp)
					compileUtil.eventHandler(node, this.$vm, dirValue, exp)   //绑定事件
				} else {
					compileUtil[dirValue] && compileUtil[dirValue](node, this.$vm, exp)   //根据获取的指令，执行指令编译
				}
			}
		})
	}
	compileText(node) {  //编译文本内容
		let exp = ''
		try {
			exp = node.textContent.replace(/\{{2}/, '').replace(/\}{2}/, '')
		} catch (err) {
			throw Error(err)
		}
		// console.log(exp)          //获取表达式（属性）
		compileUtil.text(node, this.$vm, exp);    //正式编译
	}
	isElementNode(node) {   
		return node.nodeType === 1
	}
	isTextNode(node) {
		return node.nodeType === 3
	}
	isDirective(attr) {
		return /^(v\-|\:|\@)/.test(attr)
	}
	getDirective(attr) {  //获取指令，指令前后缀
		const arr = attr.match(/^(v\-|\:|\@)/g),
			dir = arr[0],
			value = attr.split(dir)[1]
		return [dir, value]
	}
	isEventDirective(dir, value) {
		const i = value.indexOf('on:')
		if (i !== -1) value = value.substring(3)
		return /(v\-|\@)/.test(dir) && compileUtil.eventArray.includes(value)   //判断是否是事件指令,能事件类型是否合法。
	}
}


const compileUtil = {
	eventArray: ['click', 'blur', 'focus', 'mouseenter', 'mouseleave', 'keypress', 'keydown', 'keyup'],   //支持的事件类型
	text: (node, vm, exp) => {   //编译文本
		compileUtil.bind(node, vm, exp, 'text')
	},
	model: (node, vm, exp) => {   //input双向绑定
		if (node.nodeName == 'INPUT') {
			compileUtil.bind(node, vm, exp, 'model')
			node.addEventListener('input', (e) => {
				const val = e.target.value
				vm[exp] = val
			})
		}
	},
	class: (node, vm, exp) => {   //编译class
		compileUtil.bind(node, vm, exp, 'class')
	},
	style: (node, vm, exp) => {  //编译style
		compileUtil.bind(node, vm, exp, 'style')
	},
	html: (node, vm, exp) => {   //编译内容为html片段  》  vue的v-html
		compileUtil.bind(node, vm, exp, 'html')
	},
	show: (node, vm, exp) => {},  //咦，把 v-show 忘了
	eventHandler: (node, vm, dir, exp) => {   //绑定事件
		const eventType = dir.split(':').reverse()[0]
		node.addEventListener(eventType, function (e) {
			with(this) {
				eval(exp)        //执行事件里的函数
			}
			
		}.bind(vm), false)
	},
	bind: (node, vm, exp, dir) => {
		const updaterFn = updater[`${dir}Updater`]     //根据指令来的是什么的更新？
		updaterFn && updaterFn(node, compileUtil._getVMVal(vm, exp))   //存在并更新到fragment上去
		const variable = compileUtil._keyOfExp(exp)    //获取表达式里的变量，添加订阅者，变化后自动更新
		if(!variable) return
		if(Object.prototype.toString.call(variable) === '[object Array]' ) {  //数组的情况
			variable.forEach(key => {
				new Watcher(vm, key, (newVal, oldVal) => {
					updaterFn && updaterFn(node, newVal, oldVal, exp, vm)
				})
			})
		}else{
			new Watcher(vm, variable, (newVal, oldVal) => {
				updaterFn && updaterFn(node, newVal, oldVal, exp, vm)
			})
		}
		
	},
	_getVMVal: (vm, exp) => {  //获取vm里的exp（属性）的值
		let val;
		compileUtil._keyOfExp(exp).forEach(key => {
			exp = exp.replace(new RegExp(key),`this.${key}`)
		})
		val = new Function('return ' + exp).call(vm);
		// with(vm) {
		// 	val = eval(`(${exp})`)            //eval的替换
		// }
		// console.log(exp,val)
		return val
	},
	_keyOfExp(exp) {        //从一个表达式(string)里拿变量(vm的属性) —————— '1+text+"text+child.text"'  (text和child.text)
		let arr = [exp]
		if (/[\+\/\*-?:\&{2}\|{2}]/g.test(exp) && !/{.*}/.test(exp)) {
			exp = exp.replace(/\s*/g, '').match(/[a-z\']\w*(\w*\.)*\w*[\'\w*]/ig)
			if (!exp) return null
			arr = [...exp.filter(item => !/^['"]+.*['"]+$/.test(item))]
		}
		if (/{.*}/.test(exp)) {
			arr = [...exp.match(/{.*}/g).map(item => {
					return item.replace(/[{}]/g, '').split(':').reverse()[0]
				}).filter(item => !/^['"]+.*['"]+$/.test(item))]
		}
		// console.log(exp)
		return arr
	}
}

const updater = {
	textUpdater: (node, value, oldVal, exp, vm) => {  
		let text = 'textContent'
		if (oldVal === value) return
		if (oldVal !== undefined) value = node[text].replace(oldVal, value)
		if (oldVal === '') value = compileUtil._getVMVal(vm, exp)
		node[text] = typeof value == undefined ? '' : value
	},
	htmlUpdater: (node, value, oldVal) => {
		// console.log(node,value,oldVal)
		value && (node.innerHTML = value)
	},
	classUpdater: (node, value, oldValue, exp, vm) => {
		// console.log(value,oldValue,exp)
		exp && (value = compileUtil._getVMVal(vm, exp.replace(compileUtil._keyOfExp(vm, exp)[0], value)))
		if (oldValue !== undefined) oldValue = compileUtil._getVMVal(vm, exp.replace(compileUtil._keyOfExp(vm, exp)[0], oldValue))
		let className = node.className.replace(oldValue, '').replace(/\s$/, '');
		const space = className && String(value) ? ' ' : '';
		node.className = className + space + value;
	},
	styleUpdater: (node, value, oldVal) => {
		if (Object.prototype.toString.call(value) === '[object Object]') {
			Object.keys(value).forEach(key => {
				node.style[key] = value[key]
			})
		}
	},
	modelUpdater: (node, value) => {
		node.value = typeof value == 'undefined' ? '' : value;
	}
}