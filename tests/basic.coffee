
describe "Basic tests", () ->
    
    el = document.createElement 'div'
    $(el).append '<span id="s1" data-bind="name"></span>'
    data =
        name: 'khaoula'
        age: 22
    
    beforeEach () ->
        Smooth.render el, data
    
    it "works ?", () ->
        expect $(el).find '#s1'
            .to.have.text('khaoula')
