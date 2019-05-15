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
  } else if (instance.element.type !== element.type) {
    // the element type didnt change
    const newInstance = instantiate(element);
    parentDom.replaceChild(newInstance.dom, instance.dom);
    return newInstance;
  } else if (typeof element.type === "string") {
    // the element type changed and is a dom element (div, span, a, etc)
    updateDomProperties(instance.dom, instance.element.props, element.props);
    instance.childInstances = reconcileChildren(instance, element);
    instance.element = element;
    return instance;
  } else {
    // the element is a Component element
    instance.publicInstance.props = element.props;
    const childElement = instance.publicInstance.render();
    const oldChildInstance = instance.childInstance;
    const childInstance = reconcile(parentDom, oldChildInstance, childElement);
    instance.dom = childInstance.dom;
    instance.childInstance = childInstance;
    instance.element = element;
    return instance;
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
};

/**
 * Based on the didact element passed as parameter, we create a dom element, and append it children to it
 * generate an instance for the element and for each of it children.
 * @param {object} the didact element to be instantiated
 * @return {object} the instance related to the element passed as param,
 *                  it includes a reference to the dom node, the element itself, and the child instances
 */
const instantiate = element => {
  const { type, props } = element;
  const isDomElement = typeof type === "string";

  if (isDomElement) {
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
  } else {
    // instantiate Component element
    const instance = {};
    const publicInstance = createPublicInstance(element, instance);
    const childElement = publicInstance.render(); // all the Component elements only can have one child, render returns this child
    const childInstance = instantiate(childElement);
    const dom = childInstance.dom;
    Object.assign(instance, { dom, element, childInstance, publicInstance });
    return instance;
  }
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

/**
 * When there's a didact component that it type is a class, we will need to create a public instance, that it will
 * keep it state and the props. from it, this function will generate a internalInstance reference to the virtual dom in  the public reference
 * @param {object} element the element that will be used for creating the public instance
 * @param {*} internalInstance the internal instance used for keeping a reference to the virtual dom
 */
export const createPublicInstance = (element, internalInstance) => {
  const { type, props } = element;
  const publicInstance = new type(props);
  publicInstance.__internalInstance = internalInstance;
  return publicInstance;
};

/**
 * this function will trigger the reconcile of the internal instance of a public instance (class component)
 * so it make sure that the subtree of this public instance get updated (intended to be used on the setState method of the Component Class)
 * @param {*} internalInstance internal instance of a public instance (class compoment)
 */
export const updateInstance = internalInstance => {
  const parentDom = internalInstance.dom.parentNode;
  const element = internalInstance.element;
  reconcile(parentDom, internalInstance, element);
};

export default render;
