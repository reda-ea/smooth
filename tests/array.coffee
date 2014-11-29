
describe "Arrays", ->
    they = it
    
    el = document.createElement 'div'
    $(el).append '<span data-bind="names"></span>'
    data =
        names: ['fifer', 'fiddler', 'practical']
    
    they "duplicate bound elements", ->
        Smooth.render el, data
        expect $(el).find 'span'
            .to.have.length 3
            .and.text 'fiferfiddlerpractical'
    
    they "add elements as necessary", ->
        data.names.push 'loopy'
        Smooth.update el
        expect $(el).find 'span'
            .to.have.length 4
    
    they "remove elements as necessary", ->
        data.names.splice 1, 2
        Smooth.update el
        expect $(el).find 'span'
            .to.have.length 2
            .and.text 'fiferloopy'
    
    describe 'when empty', ->
        before ->
            do $(el).empty
            $(el).append '<span data-bind="names"></span>'
            data.names = []
            
        they "completely remove the element", ->
            Smooth.render el, data
            expect $(el).find 'span'
                .not.to.exist
            
        they "can put back a removed element if needed", ->
            data.names.push 'back'
            Smooth.update el
            expect $(el).find 'span'
                .to.have.length 1
                .and.html 'back'
                .and.to.match 'span[data-bind="names"]'
            
    
    describe 'with a custom parser', ->
        
        before ->
            do $(el).empty
            $(el).append '<span>{{names}}</span>'
            data.names = ['practical', 'fiddler']
            
            Smooth.attribute = (e) ->
                text = do $(e).clone().children().remove().end().text
                match = /{{([^}]+)}}/.exec text
                if match then match[1] else false
        
        they "use it on all clones", ->
            Smooth.render el, data
            expect $(el).find 'span'
                .to.have.length 2
                .and.text 'practicalfiddler'
        
        after ->
            Smooth.attribute = 'data-bind'
