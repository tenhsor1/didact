
const Didact = {
  render: (element, parentDom) => {
    const { type, props } = element;
  
    // creating the main html element to be rendered
    const dom = type === 'TEXT ELEMENT' ? document.createTextNode('') : document.createElement(type);
  
    // add the event listeners (based on the name of the prop, if it starts with 'on')
    const isListener = name => name.startsWith('on');
    Object.keys(props).filter(isListener).forEach(name => {
      const eventType = name.toLowerCase().substring(2); // we don't care about the 'on' on the string
      dom.addEventListener(eventType, props[name]);
    });
  
    // add the attributes (whatever doesn't start with 'on')
    const isAttribute = name => !isListener(name) && name !== 'children';
    Object.keys(props).filter(isAttribute).forEach(name => {
      dom[name] = props[name];
    });
  
    // recursively rendering child elements
    const childElements = props.children || [];
    childElements.forEach(childElement => {
      Didact.render(childElement, dom);
    });
  
    //appending the  main html element to the parent dom
    parentDom.appendChild(dom);
  }
}

export default Didact;

