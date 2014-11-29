
describe "Basic functionality", ->

    el = document.createElement 'div'
    $(el).append '<span id="s1" data-bind="name"></span>'
    data =
        name: 'khaoula'
        s1: 22
    
    it "renders a basic binding", ->
        Smooth.render el, data
        expect $(el).find '#s1'
            .to.have.text('khaoula')
    
    it "correctly updates a rendered binding", ->
        data.name = 'reda'
        Smooth.update el
        expect $(el).find '#s1'
            .to.have.text('reda')
    
    it "allows defining a custom attribute", ->
        Smooth.attribute = 'id'
        Smooth.render el, data
        expect $(el).find '#s1'
            .to.have.text('22')
    
    it "allows defining a custom binding parser", ->
        Smooth.attribute = (e) ->
            do e.tagName.toLowerCase
        data.div =
            span: 'custom'
        Smooth.render el, data
        expect $(el).find '#s1'
            .to.have.text('custom')

    after ->
        Smooth.attribute = 'data-bind'
