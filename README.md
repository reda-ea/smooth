smooth
======

the easiest javascript templating engine

usage
-----

the main functionality associates a data object to an existing DOM structure in
the document.

1. add the appropriate binding attributes to DOM elements
2. call `Smooth.render` on the topmost element (with the binding object)

That's it! This will fill the DOM structure with the object's contents, and (for
user editable elements such as inputs) automatically keep them synchonized.

Elements bound to arrays will be duplicated, each copy bound to the appropriate
array element(s).

Elements bound to objects will have their sub-elements bound to properties of 
that object (or any object at that place in the main binding object - in case 
the sub-object itself is replaced).

Changes to the object made during bound event callbacks (and any other template
triggered action) will automatically be reflected on the DOM structure. Other
changes can be applied at any times using the `Smooth.update` function.

examples
--------

A fairly complex example, exposing most of the engine's features, can be accessed
here: http://jsfiddle.net/drnsxdo4/

syntax
------

Just add a `data-bind` attribute to any DOM element.
The attribute should contain a space separated list of binding descriptions.

A binding description has one two formats:

* `data@target` for a data binding: sets the content of the target attribute
  (or the element itsef if no attribute is specified) to the value of the
  specified data property (of the binding object)
* `!action@event` for an action binding: associates an element event (or a
  default event if nothing is specified) to the indicated action (which should
  be a function property of the currently bound object)

Note: the `@` is optional if no target/event is specified.

notes
-----
* DOM4 support is required ([DOM-shim](
  https://github.com/Raynos/DOM-shim) may be needed)
