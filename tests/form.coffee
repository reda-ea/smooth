
describe "Binding to form elements", ->
    
    el = document.createElement 'div'
    $(el).append '<input type="text" id="s1" data-bind="name"></input>'
    data =
        name: 'reda'
        age: 22
    Smooth.render el, data
    
    beforeEach () ->
        Smooth.update el, data
    
    it "should affect the input's value", ->
        expect $(el).find '#s1'
            .to.have.value 'reda'
    
    # FIXME find a way to test the input event, to get rid of this
    runDefaultInputHandler = (els) ->
        e.__smooth.defaultInputHandler.call(e) for e in els
    
    it "should make a two-way binding", () ->
        $(el).find '#s1'
            .val 'khaoula'
        # manually run the event for now
        runDefaultInputHandler $(el).find '#s1'
        expect data.name
            .to.equal 'khaoula'