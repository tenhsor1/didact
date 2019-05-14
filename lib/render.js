let rootInstance = null;

const render = (element, container) => {
  const prevInstance = rootInstance;
  const nextInstance = reconcile(container, prevInstance, element);
  rootInstance = nextInstance;
};

/**
 * Compare the instance and the element, and based on that, decides what to refresh/append to the dom.
 * @param {DomNode} parentDom dom node where the @element will be appended
 * @param {object} instance current instance
 * @param {*} element new element to be reconciled
 */
const reconcile = (parentDom, instance, element) => {
  if (instance === null) {
    const newInstance = instantiate(element);
    parentDom.appendChild(newInstance.dom);
    return newInstance;
  } else if (element === null) {
    parentDom.removeChild(instance.dom);
  } else if (instance.type === element.type) {
    updateDomProperties(instance.dom, instance.element.props, element.props);
    instance.childInstances = reconcileChildren(instance, element);
    instance.element = element;
    return instance;
  } else {
    const newInstance = instantiate(element);
    parentDom.replaceChild(newInstance.dom, instance.dom);
    return newInstance;
  }
};

/**
 * Reconcile current instance children with the next element children
 * @param {*} instance current instance
 * @param {*} element  next element
 */
const reconcileChildren = (instance, element) => {
  const dom = instance.dom;
  const childInstances = instance.childInstances;
  const nextChildElements = element.props.children || [];
  const newChildInstances = [];
  // reconcile whatever has the most elements, the current instance, or the next element
  const count = Math.max(childInstances.length, nextChildElements.length);
  for (let i = 0; i < count; i++) {
    const childInstance = childInstances[i];
    const childElement = nextChildElements[i];
    const newChildInstance = reconcile(dom, childInstance, childElement);
    newChildInstances.push(newChildInstance);
  }
  return newChildInstances.filter(instance => instance != null);
}


/**
 * Based on the didact element passed as parameter, we create a dom element, and append it children to it
 * generate an instance for the element and for each of it children.
 * @param {object} the didact element to be instantiated
 * @return {object} the instance related to the element passed as param,
 *                  it includes a reference to the dom node, the element itself, and the child instances
 */
const instantiate = element => {
  const { type, props } = element;

  // creating the main html element to be rendered
  const dom =
    type === "TEXT ELEMENT"
      ? document.createTextNode("")
      : document.createElement(type);
  
  updateDomProperties(dom, {}, props);
  // recursively instantiate child elements
  const childElements = props.children || [];
  const childInstances = childElements.map(instantiate);
  const childDoms = childInstances.map(childInstance => childInstance.dom);
  childDoms.forEach(childDom => dom.appendChild(childDom));

  const instance = { dom, element, childInstances };
  return instance;
};

const updateDomProperties = (dom, prevProps, nextProps) => {
  const isEvent = name => name.startsWith("on");
  const isAttribute = name => !isEvent(name) && name !== "children";

  // TODO: instead of removing and adding all the props, improve it to update and add when needed
  // remove listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });
  // remove attributes
  Object.keys(prevProps)
    .filter(isAttribute)
    .forEach(name => {
      dom[name] = null;
    });
  // add the event listeners (based on the name of the prop, if it starts with 'on')
  Object.keys(nextProps)
    .filter(isEvent)
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2); // we don't care about the 'on' on the string
      dom.addEventListener(eventType, nextProps[name]);
    });
  // add the attributes (whatever doesn't start with 'on')
  Object.keys(nextProps)
    .filter(isAttribute)
    .forEach(name => {
      dom[name] = nextProps[name];
    });
};

export default render;
